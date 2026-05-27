import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import './AuthModal.css'

export default function AuthModal({ onClose, defaultTab = 'login' }) {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [tab,         setTab]         = useState(defaultTab)
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [username,    setUsername]    = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const switchTab = (t) => { setTab(t); setError('') }

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
      } else {
        await signUpWithEmail(email, password, username)
      }
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

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? '…' : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

        </div>

        {/* ── Footer ── */}
        <div className="auth-modal__footer">
          <p className="auth-modal__switch">
            {tab === 'login'
              ? <>Don't have an account?{' '}<button className="auth-link" onClick={() => switchTab('signup')}>Sign up</button></>
              : <>Already have an account?{' '}<button className="auth-link" onClick={() => switchTab('login')}>Log in</button></>
            }
          </p>
        </div>

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
  return err?.message || 'Something went wrong. Please try again.'
}
