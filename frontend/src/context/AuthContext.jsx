import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from '../firebase'
import { setCurrentUser } from '../utils/bookmarks'

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

  // Track Firebase auth state and sync with backend
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
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
            const payload = {}
            if (!dbUser.avatar_url) { const v = find('gv_profile_pfp');    if (v) payload.avatar_url = v }
            if (!dbUser.banner_url) { const v = find('gv_profile_banner'); if (v) payload.banner_url = v }
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

  // ── Sign-in methods ──────────────────────────────────────────────────────

  const signUpWithEmail = async (email, password, username) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: username })
    const { user: dbUser } = await syncWithBackend(credential.user, username)
    setUser(dbUser)
    return dbUser
  }

  const signInWithEmail = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const { user: dbUser } = await syncWithBackend(credential.user)
    setUser(dbUser)
    return dbUser
  }

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
      logout,
      refreshUser,
      setUser,
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
