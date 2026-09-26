import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../firebase'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth'
import { uploadImageFile } from '../utils/imageUpload'
import './SettingsPage.css'

const API = import.meta.env.VITE_API_URL || '/api'

const NAV = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, authFetch, refreshUser, logout } = useAuth()
  const [active, setActive] = useState('profile')

  // ── Username ───────────────────────────────────────────────────────────
  const [username,       setUsername]       = useState(user?.username || '')
  const [usernameMsg,    setUsernameMsg]    = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    setUsernameMsg('')
    const trimmed = username.trim()
    if (!trimmed || trimmed === user?.username) return
    if (trimmed.length < 3)                { setUsernameMsg('Must be at least 3 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setUsernameMsg('Letters, numbers and underscores only.'); return }
    setUsernameSaving(true)
    try {
      const res  = await authFetch(`${API}/users/me`, { method: 'PATCH', body: JSON.stringify({ username: trimmed }) })
      const data = await res.json()
      if (!res.ok) { setUsernameMsg(data.message || 'Failed to update.'); return }
      await refreshUser()
      setUsernameMsg('✓ Username updated.')
    } catch { setUsernameMsg('Something went wrong.') }
    finally   { setUsernameSaving(false) }
  }

  // ── Avatar ─────────────────────────────────────────────────────────────
  const pfpRef = useRef(null)
  const [avatarMsg, setAvatarMsg] = useState('')

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarMsg('')
    try {
      const url = await uploadImageFile(file, 'avatar')
      const res = await authFetch(`${API}/users/me`, { method: 'PATCH', body: JSON.stringify({ avatar_url: url }) })
      if (!res.ok) throw new Error(`Saving avatar failed: ${res.status}`)
      await refreshUser()
      setAvatarMsg('✓ Profile picture updated.')
    } catch { setAvatarMsg('Failed to update picture.') }
    finally  { e.target.value = '' }
  }

  const handleRemoveAvatar = async () => {
    setAvatarMsg('')
    try {
      await authFetch(`${API}/users/me`, { method: 'PATCH', body: JSON.stringify({ avatar_url: null }) })
      await refreshUser()
      setAvatarMsg('✓ Profile picture removed.')
    } catch { setAvatarMsg('Failed to remove picture.') }
  }

  // ── Password ───────────────────────────────────────────────────────────
  const hasPassword = auth.currentUser?.providerData.some(p => p.providerId === 'password')
  const hasGoogle   = auth.currentUser?.providerData.some(p => p.providerId === 'google.com')

  const [currentPass,   setCurrentPass]   = useState('')
  const [newPass,       setNewPass]       = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [passwordMsg,   setPasswordMsg]   = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handleAddPassword = async (e) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPass.length < 8)     { setPasswordMsg('Must be at least 8 characters.'); return }
    if (newPass !== confirmPass) { setPasswordMsg('Passwords do not match.'); return }
    setPasswordSaving(true)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, newPass)
      await linkWithCredential(auth.currentUser, cred)
      setNewPass(''); setConfirmPass('')
      setPasswordMsg('✓ Password added. You can now sign in with email and password.')
    } catch (err) {
      setPasswordMsg(err?.code === 'auth/provider-already-linked' ? 'Already linked.' : 'Failed to add password.')
    } finally { setPasswordSaving(false) }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPass.length < 8)     { setPasswordMsg('Must be at least 8 characters.'); return }
    if (newPass !== confirmPass) { setPasswordMsg('Passwords do not match.'); return }
    setPasswordSaving(true)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPass)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPass)
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      setPasswordMsg('✓ Password updated.')
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setPasswordMsg('Current password is incorrect.')
      else if (code === 'auth/too-many-requests') setPasswordMsg('Too many attempts. Try again later.')
      else setPasswordMsg('Failed to update password.')
    } finally { setPasswordSaving(false) }
  }

  // ── Delete account ─────────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false)

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await logout() } catch {}
    navigate('/')
    window.scrollTo(0, 0)
  }

  if (!user) return null

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-header__inner">
          <button className="settings-back" onClick={() => navigate('/account')}>← Profile</button>
          <h1 className="settings-title">Settings</h1>
        </div>
      </div>

      <div className="settings-body">

        {/* ── Left nav ── */}
        <nav className="settings-nav">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              className={`settings-nav__item${active === id ? ' settings-nav__item--active' : ''}`}
              onClick={() => setActive(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <div className="settings-content">

          {/* ══ Profile ══ */}
          {active === 'profile' && (
            <>
              {/* Avatar */}
              <section className="settings-section">
                <h2 className="settings-section__title">Profile Picture</h2>
                <p className="settings-section__desc">
                  This image appears on your profile, boards, and comments.
                </p>
                <div className="settings-avatar-row">
                  <div className="settings-avatar">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt={user.username} />
                      : <span>{user.username?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="settings-avatar-actions">
                    <button className="settings-btn" onClick={() => pfpRef.current?.click()}>
                      Upload new picture
                    </button>
                    {user.avatar_url && (
                      <button className="settings-btn settings-btn--ghost" onClick={handleRemoveAvatar}>
                        Remove
                      </button>
                    )}
                  </div>
                  <input ref={pfpRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                </div>
                {avatarMsg && (
                  <p className={`settings-msg${avatarMsg.startsWith('✓') ? ' settings-msg--ok' : ' settings-msg--err'}`}>
                    {avatarMsg}
                  </p>
                )}
              </section>

              {/* Username */}
              <section className="settings-section">
                <h2 className="settings-section__title">Username</h2>
                <p className="settings-section__desc">
                  Your public display name across the site. Letters, numbers, and underscores only.
                </p>
                <form className="settings-form" onSubmit={handleSaveUsername}>
                  <input
                    className="settings-input"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setUsernameMsg('') }}
                    placeholder="Username"
                    maxLength={30}
                  />
                  {usernameMsg && (
                    <p className={`settings-msg${usernameMsg.startsWith('✓') ? ' settings-msg--ok' : ' settings-msg--err'}`}>
                      {usernameMsg}
                    </p>
                  )}
                  <button className="settings-btn" type="submit" disabled={usernameSaving || username.trim() === user.username}>
                    {usernameSaving ? 'Saving…' : 'Save Username'}
                  </button>
                </form>
              </section>
            </>
          )}

          {/* ══ Account ══ */}
          {active === 'account' && (
            <>
              {/* Sign-in methods */}
              <section className="settings-section">
                <h2 className="settings-section__title">Sign-in Methods</h2>
                <p className="settings-section__desc">
                  Ways you can log in to your account.
                </p>
                <div className="settings-providers">
                  {hasGoogle && (
                    <div className="settings-provider">
                      <svg className="settings-provider__icon" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <div className="settings-provider__info">
                        <span className="settings-provider__name">Google</span>
                        <span className="settings-provider__email">{user.email}</span>
                      </div>
                      <span className="settings-provider__badge">Linked</span>
                    </div>
                  )}
                  {hasPassword && (
                    <div className="settings-provider">
                      <svg className="settings-provider__icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                      <div className="settings-provider__info">
                        <span className="settings-provider__name">Email & Password</span>
                        <span className="settings-provider__email">{user.email}</span>
                      </div>
                      <span className="settings-provider__badge">Linked</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Password */}
              <section className="settings-section">
                {hasPassword ? (
                  <>
                    <h2 className="settings-section__title">Change Password</h2>
                    <p className="settings-section__desc">Enter your current password, then set a new one.</p>
                    <form className="settings-form" onSubmit={handleSavePassword}>
                      <input className="settings-input" type="password" value={currentPass}
                        onChange={(e) => { setCurrentPass(e.target.value); setPasswordMsg('') }}
                        placeholder="Current password" autoComplete="current-password" />
                      <input className="settings-input" type="password" value={newPass}
                        onChange={(e) => { setNewPass(e.target.value); setPasswordMsg('') }}
                        placeholder="New password (min. 8 characters)" autoComplete="new-password" />
                      <input className="settings-input" type="password" value={confirmPass}
                        onChange={(e) => { setConfirmPass(e.target.value); setPasswordMsg('') }}
                        placeholder="Confirm new password" autoComplete="new-password" />
                      {passwordMsg && (
                        <p className={`settings-msg${passwordMsg.startsWith('✓') ? ' settings-msg--ok' : ' settings-msg--err'}`}>{passwordMsg}</p>
                      )}
                      <button className="settings-btn" type="submit" disabled={passwordSaving || !currentPass || !newPass || !confirmPass}>
                        {passwordSaving ? 'Saving…' : 'Update Password'}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="settings-section__title">Add Password Sign-In</h2>
                    <p className="settings-section__desc">
                      Your account uses Google. Set a password to also sign in with email and password.
                    </p>
                    <form className="settings-form" onSubmit={handleAddPassword}>
                      <input className="settings-input" type="password" value={newPass}
                        onChange={(e) => { setNewPass(e.target.value); setPasswordMsg('') }}
                        placeholder="New password (min. 8 characters)" autoComplete="new-password" />
                      <input className="settings-input" type="password" value={confirmPass}
                        onChange={(e) => { setConfirmPass(e.target.value); setPasswordMsg('') }}
                        placeholder="Confirm new password" autoComplete="new-password" />
                      {passwordMsg && (
                        <p className={`settings-msg${passwordMsg.startsWith('✓') ? ' settings-msg--ok' : ' settings-msg--err'}`}>{passwordMsg}</p>
                      )}
                      <button className="settings-btn" type="submit" disabled={passwordSaving || !newPass || !confirmPass}>
                        {passwordSaving ? 'Saving…' : 'Add Password'}
                      </button>
                    </form>
                  </>
                )}
              </section>

              {/* Logout */}
              <section className="settings-section">
                <h2 className="settings-section__title">Log Out</h2>
                <p className="settings-section__desc">You'll need to sign in again to access your account.</p>
                <button className="settings-btn settings-btn--danger" onClick={handleLogout}>
                  Log Out
                </button>
              </section>

              {/* Delete account */}
              <section className="settings-section settings-section--danger">
                <h2 className="settings-section__title">Delete Account</h2>
                <p className="settings-section__desc">
                  Permanently delete your account and everything on it. This cannot be undone.
                </p>
                {user.role === 'Owner' ? (
                  <p className="settings-msg settings-msg--err">
                    The Owner account cannot be deleted. Transfer the Owner role to another account first.
                  </p>
                ) : (
                  <button className="settings-btn settings-btn--danger" onClick={() => setShowDelete(true)}>
                    Delete Account…
                  </button>
                )}
              </section>
            </>
          )}

        </div>
      </div>

      {showDelete && (
        <DeleteAccountModal
          user={user}
          hasPassword={hasPassword}
          authFetch={authFetch}
          logout={logout}
          onClose={() => setShowDelete(false)}
          onDeleted={() => { navigate('/'); window.scrollTo(0, 0) }}
        />
      )}
    </div>
  )
}

const DELETED_ITEMS = [
  'Your profile: username, bio, birthday, avatar and banner',
  'Your boards, and every comment on them',
  'Your comments, reviews, upvotes and profile notes',
  'Your follows, followers, favourites and linked game accounts',
  'Your sign-in, including Google and email/password',
]

function DeleteAccountModal({ user, hasPassword, authFetch, logout, onClose, onDeleted }) {
  const [typed,    setTyped]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [deleting, setDeleting] = useState(false)

  const canDelete = typed === user.username && (!hasPassword || password) && !deleting

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !deleting) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleting, onClose])

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!canDelete) return
    setError('')
    setDeleting(true)
    try {
      // Password accounts prove it's really them before anything is removed.
      if (hasPassword) {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, password)
        await reauthenticateWithCredential(auth.currentUser, cred)
      }
      const res = await authFetch(`${API}/users/me`, {
        method: 'DELETE',
        body: JSON.stringify({ confirm: typed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || 'Failed to delete account. Nothing was removed.')
        setDeleting(false)
        return
      }
      // Clear this account's locally cached data (keys are scoped as "<name>__<userId>").
      try {
        Object.keys(localStorage)
          .filter((key) => key.endsWith(`__${user.id}`))
          .forEach((key) => localStorage.removeItem(key))
      } catch {}
      try { await logout() } catch {}
      onDeleted()
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError('Password is incorrect.')
      else if (code === 'auth/too-many-requests') setError('Too many attempts. Try again later.')
      else setError('Something went wrong. Nothing was removed.')
      setDeleting(false)
    }
  }

  return (
    <div className="settings-modal-overlay" onClick={() => { if (!deleting) onClose() }}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-account-title" className="settings-section__title">Delete your account?</h2>
        <p className="settings-section__desc">
          This permanently deletes <strong>{user.username}</strong>. It cannot be undone, and
          nothing can be recovered afterwards. The following will be removed:
        </p>
        <ul className="settings-modal__list">
          {DELETED_ITEMS.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="settings-section__desc">
          Reports and suggestions you submitted stay with the moderators but are no longer linked to you.
        </p>

        <form className="settings-form" onSubmit={handleDelete}>
          <label className="settings-modal__label" htmlFor="delete-confirm">
            To confirm, type your username <strong>{user.username}</strong>
          </label>
          <input
            id="delete-confirm"
            className="settings-input"
            type="text"
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setError('') }}
            autoComplete="off"
            autoFocus
            disabled={deleting}
          />
          {hasPassword && (
            <input
              className="settings-input"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Current password"
              autoComplete="current-password"
              disabled={deleting}
            />
          )}
          {error && <p className="settings-msg settings-msg--err">{error}</p>}
          <div className="settings-modal__actions">
            <button type="button" className="settings-btn settings-btn--ghost" onClick={onClose} disabled={deleting}>
              Cancel
            </button>
            <button type="submit" className="settings-btn settings-btn--danger-solid" disabled={!canDelete}>
              {deleting ? 'Deleting…' : 'Permanently delete account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
