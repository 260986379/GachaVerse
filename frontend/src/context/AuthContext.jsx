import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential,
  sendPasswordResetEmail,
} from '../firebase'
import { setCurrentUser, setAuthFetch } from '../utils/bookmarks'
import { uploadImage } from '../utils/imageUpload'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || '/api'

async function syncWithBackend(firebaseUser, desiredUsername) {
  const idToken = await firebaseUser.getIdToken()
  const res = await fetch(`${API}/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ username: desiredUsername }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to sync account')
  }
  return res.json() // { user, isNew }
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = still loading
  const [user, setUser]                 = useState(null)
  const [loadingAuth, setLoadingAuth]   = useState(true)
  const [authError,   setAuthError]     = useState(null)
  const [pendingLink, setPendingLink]   = useState(null) // { email, credential }
  const skipSyncRef = useRef(false) // true while signUpWithEmail is in flight

  // Track Firebase auth state and sync with backend
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        if (skipSyncRef.current) {
          // signUpWithEmail owns the initial DB sync — skip to avoid creating
          // the user row before the chosen username is available
          setLoadingAuth(false)
          return
        }
        try {
          const { user: dbUser } = await syncWithBackend(fbUser)
          setCurrentUser(dbUser.id)   // scope all localStorage to this user
          setUser(dbUser)

          // ── Legacy image migration ───────────────────────────────────────
          // Images saved before login are under __guest or unscoped keys.
          // Push them to the DB once so the user shows up in Community.
          if (!dbUser.avatar_url || !dbUser.banner_url) {
            const find = (base) =>
              localStorage.getItem(`${base}__${dbUser.id}`) ||
              localStorage.getItem(`${base}__guest`)        ||
              localStorage.getItem(base)                    ||
              null
            // Guest images are data URLs; the API only accepts Storage URLs now (#45),
            // so upload them first. Anything else (e.g. a stale URL) is skipped.
            const toUpload = []
            if (!dbUser.avatar_url) { const v = find('gv_profile_pfp');    if (v?.startsWith('data:image/')) toUpload.push(['avatar_url', 'avatar', v]) }
            if (!dbUser.banner_url) { const v = find('gv_profile_banner'); if (v?.startsWith('data:image/')) toUpload.push(['banner_url', 'banner', v]) }
            const payload = {}
            for (const [col, kind, dataUrl] of toUpload) {
              try {
                const blob = await (await fetch(dataUrl)).blob()
                payload[col] = await uploadImage(blob, kind)
              } catch (err) {
                console.error(`[Auth] Guest ${kind} upload failed:`, err)
              }
            }
            if (Object.keys(payload).length > 0) {
              const token = await fbUser.getIdToken()
              fetch(`${API}/users/me`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify(payload),
              })
                .then(r => {
                  if (!r.ok) throw new Error(`Image sync failed: ${r.status}`)
                  return r.json()
                })
                .then(updated => setUser(prev => ({ ...prev, ...updated })))
                .catch(console.error)
            }
          }
          // ────────────────────────────────────────────────────────────────
        } catch (e) {
          console.error('[Auth] Backend sync failed:', e.message)
          setCurrentUser(null)        // fall back to guest scope
          setUser(null)
        }
      } else {
        setCurrentUser(null)          // guest scope on logout
        setUser(null)
      }
      setLoadingAuth(false)
    })
    return unsub
  }, [])

  const getIdToken = useCallback(async () => {
    if (!firebaseUser) throw new Error('Not authenticated')
    return firebaseUser.getIdToken()
  }, [firebaseUser])

  /** Fetch wrapper that auto-attaches the Firebase ID token */
  const authFetch = useCallback(async (url, options = {}) => {
    const token = await getIdToken()
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    })
  }, [getIdToken])

  // Keep bookmarks.js in sync so toggleFav* can call the DB when logged in
  useEffect(() => {
    setAuthFetch(user ? authFetch : null)
  }, [user, authFetch])

  // ── Sign-in methods ──────────────────────────────────────────────────────

  const signUpWithEmail = async (email, password, username) => {
    skipSyncRef.current = true
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: username })
      const { user: dbUser, isNew } = await syncWithBackend(credential.user, username)
      setUser(dbUser)
      return { user: dbUser, isNew }
    } finally {
      skipSyncRef.current = false
    }
  }

  const signInWithEmail = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const { user: dbUser } = await syncWithBackend(credential.user)
    setUser(dbUser)
    return dbUser
  }

  // On page load after a Google redirect, consume the result so Firebase finalises auth state.
  useEffect(() => {
    getRedirectResult(auth)
      .then((_result) => { /* success handled by onAuthStateChanged */ })
      .catch((e) => {
        if (e.code === 'auth/account-exists-with-different-credential') {
          setPendingLink({
            email:      e.customData?.email || '',
            credential: GoogleAuthProvider.credentialFromError(e),
          })
        } else {
          // Anything else used to vanish silently, leaving the user signed out with no clue why.
          console.error('[Auth] Google redirect sign-in failed:', e.code, e.message)
        }
      })
  }, [])

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    signInWithRedirect(auth, provider)
  }

  const linkGoogleAccount = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    if (pendingLink?.credential) {
      try {
        await linkWithCredential(credential.user, pendingLink.credential)
      } catch (linkErr) {
        // Linking failed (e.g. credential expired) but the user is authenticated —
        // just proceed without linking rather than blocking login entirely.
        console.warn('[Auth] Google link failed:', linkErr.code)
      }
    }
    const { user: dbUser } = await syncWithBackend(credential.user)
    setCurrentUser(dbUser.id)
    setUser(dbUser)
    setPendingLink(null)
    return dbUser
  }

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setFirebaseUser(null)
  }

  const refreshUser = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/auth/me`)
      if (res.ok) setUser(await res.json())
    } catch (e) {
      console.error('[Auth] refreshUser failed:', e.message)
    }
  }, [authFetch])

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      user,
      loadingAuth,
      isLoggedIn: !!user,
      getIdToken,
      authFetch,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      logout,
      refreshUser,
      setUser,
      authError,
      clearAuthError: () => setAuthError(null),
      pendingLink,
      linkGoogleAccount,
      clearPendingLink: () => setPendingLink(null),
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
