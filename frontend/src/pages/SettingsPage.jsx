import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../firebase'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import './SettingsPage.css'

const API = import.meta.env.VITE_API_URL || '/api'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, authFetch, refreshUser, logout } = useAuth()

  // ── Username ─────────────────────────────────────────────────────────
  const [username,     setUsername]     = useState(user?.username || '')
  const [usernameMsg,  setUsernameMsg]  = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    setUsernameMsg('')
    const trimmed = username.trim()
    if (!trimmed || trimmed === user?.username) return
    if (trimmed.length < 3) { setUsernameMsg('Username must be at least 3 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setUsernameMsg('Letters, numbers and underscores only.'); return }

    setUsernameSaving(true)
    try {
      const res = await authFetch(`${API}/users/me`, {
        method: 'PATCH',
        body: JSON.stringify({ username: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setUsernameMsg(data.message || 'Failed to update username.'); return }
      await refreshUser()
      setUsernameMsg('✓ Username updated.')
    } catch {
      setUsernameMsg('Something went wrong.')
    } finally {
      setUsernameSaving(false)
    }
  }

  // ── Password ─────────────────────────────────────────────────────────
  const [currentPass,  setCurrentPass]  = useState('')
  const [newPass,      setNewPass]      = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [passwordMsg,  setPasswordMsg]  = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPass.length < 8) { setPasswordMsg('New password must be at least 8 characters.'); return }
    if (newPass !== confirmPass) { setPasswordMsg('Passwords do not match.'); return }

    setPasswordSaving(true)
    try {
      const fbUser = auth.currentUser
      const credential = EmailAuthProvider.credential(fbUser.email, currentPass)
      await reauthenticateWithCredential(fbUser, credential)
      await updatePassword(fbUser, newPass)
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      setPasswordMsg('✓ Password updated.')
    } catch (e) {
      const code = e?.code || ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setPasswordMsg('Current password is incorrect.')
      else if (code === 'auth/too-many-requests')
        setPasswordMsg('Too many attempts. Try again later.')
      else
        setPasswordMsg('Failed to update password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="settings-page">
      <div className="settings-inner">

        <div className="settings-header">
          <button className="settings-back" onClick={() => navigate('/account')}>← Back</button>
          <h1 className="settings-title">Settings</h1>
        </div>

        {/* ── Display Name ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">Display Name</h2>
          <p className="settings-section__desc">
            This is your public username shown across the site.
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
            <button
              className="settings-btn"
              type="submit"
              disabled={usernameSaving || username.trim() === user.username}
            >
              {usernameSaving ? 'Saving…' : 'Save Username'}
            </button>
          </form>
        </section>

        {/* ── Password ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">Change Password</h2>
          <p className="settings-section__desc">
            Enter your current password to confirm, then set a new one.
          </p>
          <form className="settings-form" onSubmit={handleSavePassword}>
            <input
              className="settings-input"
              type="password"
              value={currentPass}
              onChange={(e) => { setCurrentPass(e.target.value); setPasswordMsg('') }}
              placeholder="Current password"
              autoComplete="current-password"
            />
            <input
              className="settings-input"
              type="password"
              value={newPass}
              onChange={(e) => { setNewPass(e.target.value); setPasswordMsg('') }}
              placeholder="New password (min. 8 characters)"
              autoComplete="new-password"
            />
            <input
              className="settings-input"
              type="password"
              value={confirmPass}
              onChange={(e) => { setConfirmPass(e.target.value); setPasswordMsg('') }}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            {passwordMsg && (
              <p className={`settings-msg${passwordMsg.startsWith('✓') ? ' settings-msg--ok' : ' settings-msg--err'}`}>
                {passwordMsg}
              </p>
            )}
            <button
              className="settings-btn"
              type="submit"
              disabled={passwordSaving || !currentPass || !newPass || !confirmPass}
            >
              {passwordSaving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* ── Danger zone ── */}
        <section className="settings-section settings-section--danger">
          <h2 className="settings-section__title">Account</h2>
          <button className="settings-btn settings-btn--danger" onClick={handleLogout}>
            Log Out
          </button>
        </section>

      </div>
    </div>
  )
}
