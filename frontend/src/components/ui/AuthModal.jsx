import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AuthModal.css'

export default function AuthModal({ onClose, defaultTab = 'login' }) {
  const navigate = useNavigate()
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, pendingLink, linkGoogleAccount, clearPendingLink, resetPassword } = useAuth()
  const [tab,         setTab]         = useState(defaultTab)
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [username,    setUsername]    = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [resetSent,   setResetSent]   = useState(false)
  const [resetting,   setResetting]   = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const switchTab = (t) => { setTab(t); setError('') }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const { isNew } = await signInWithGoogle()
      onClose()
      if (isNew) navigate('/settings')
    } catch (e) {
      console.error('[Google Sign-In]', e?.code, e?.message)
      // account-exists: pendingLink is now set in context — modal switches to link mode automatically
      if (e?.code === 'auth/account-exists-with-different-credential') return
      if (e?.code !== 'auth/cancelled-popup-request') {
        setError(friendlyError(e))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (tab === 'signup') {
      if (password !== confirmPass)           { setError('Passwords do not match'); return }
      if (username.length < 3)                { setError('Username must be at least 3 characters'); return }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Letters, numbers and underscores only'); return }
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        await signInWithEmail(email, password)
        onClose()
      } else {
        const { isNew } = await signUpWithEmail(email, password, username)
        onClose()
        if (isNew) navigate('/settings')
      }
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above first.'); return }
    setResetting(true)
    setError('')
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setResetting(false)
    }
  }

  const handleLink = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await linkGoogleAccount(pendingLink.email, password)
      onClose()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="auth-modal__header">
          <span className="auth-modal__brand">MyGachaList</span>
          <button className="auth-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="auth-modal__body">

          {pendingLink ? (
            /* ── Link Google to existing account ── */
            <>
              <p className="auth-link-notice">
                Enter the password for <strong>{pendingLink.email}</strong> to link your
                Google account. You'll be able to sign in with either method going forward.
              </p>
              <form className="auth-form" onSubmit={handleLink}>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  autoFocus
                />
                {error && <p className="auth-error">{error}</p>}
                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading ? '…' : 'Link & Sign In'}
                </button>
                <button
                  type="button"
                  className="auth-link"
                  style={{ textAlign: 'center', marginTop: '0.25rem' }}
                  onClick={() => { clearPendingLink(); setError('') }}
                >
                  Cancel — sign in normally instead
                </button>
              </form>
            </>
          ) : (
            /* ── Normal login / signup ── */
            <>
              <div className="auth-modal__tabs">
                <button
                  className={`auth-tab${tab === 'login'  ? ' auth-tab--active' : ''}`}
                  onClick={() => switchTab('login')}
                >Log In</button>
                <button
                  className={`auth-tab${tab === 'signup' ? ' auth-tab--active' : ''}`}
                  onClick={() => switchTab('signup')}
                >Sign Up</button>
              </div>

              <button className="auth-google-btn" type="button" onClick={handleGoogle} disabled={loading}>
                <svg className="auth-google-btn__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="auth-divider"><span>or</span></div>

              {error && <p className="auth-error">{error}</p>}

              <form className="auth-form" onSubmit={handleSubmit}>
                {tab === 'signup' && (
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                )}

                <input
                  className="auth-input"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus={tab === 'login'}
                />

                <input
                  className="auth-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                />

                {tab === 'signup' && (
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                )}

                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading ? '…' : tab === 'login' ? 'Log In' : 'Create Account'}
                </button>
              </form>
            </>
          )}

        </div>

        {/* ── Footer ── */}
        {!pendingLink && (
          <div className="auth-modal__footer">
            {resetSent ? (
              <p className="auth-modal__switch">
                Reset email sent to <strong>{email}</strong>. Check your inbox.
              </p>
            ) : (
              <p className="auth-modal__switch">
                {tab === 'login' ? (
                  <>
                    <button className="auth-link" onClick={handleForgotPassword} disabled={resetting}>
                      {resetting ? 'Sending…' : 'Forgot password?'}
                    </button>
                    {' · '}
                    Don't have an account?{' '}
                    <button className="auth-link" onClick={() => switchTab('signup')}>Sign up</button>
                  </>
                ) : (
                  <>Already have an account?{' '}<button className="auth-link" onClick={() => switchTab('login')}>Log in</button></>
                )}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function friendlyError(err) {
  const code = err?.code || ''
  if (code === 'auth/email-already-in-use') return 'That email is already registered.'
  if (code === 'auth/invalid-email')         return 'Invalid email address.'
  if (code === 'auth/weak-password')         return 'Password must be at least 8 characters.'
  if (code === 'auth/user-not-found')        return 'No account found with that email.'
  if (code === 'auth/wrong-password')        return 'Incorrect password.'
  if (code === 'auth/invalid-credential')    return 'Invalid email or password.'
  if (code === 'auth/too-many-requests')     return 'Too many attempts. Try again later.'
  if (code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user')  return 'Google sign-in was blocked. Allow popups for this site, or use an incognito window.'
  return err?.message || 'Something went wrong. Please try again.'
}
