import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SearchModal from './ui/SearchModal'
import NotifPanel  from './ui/NotifPanel'
import AuthModal   from './ui/AuthModal'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { getRoleStyle, getRoleGlow } from '../utils/roles'
import './Navbar.css'

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.337 0-10 1.671-10 5v1a1 1 0 001 1h18a1 1 0 001-1v-1c0-3.329-6.663-5-10-5z"/>
    </svg>
  )
}

const HIDE_SEARCH_ON = ['/account']
const KOFI_URL = 'https://ko-fi.com/celestinbrothers'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [authOpen,   setAuthOpen]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [notifOpen,  setNotifOpen]  = useState(false)
  const location                    = useLocation()
  const showSearch                  = !HIDE_SEARCH_ON.includes(location.pathname)
  const menuRef                     = useRef(null)

  const navigate = useNavigate()
  const { user, logout, loadingAuth, pendingLink, clearPendingLink } = useAuth()
  const { items, socialItems, loading, unreadCount, lastSeen, markAllRead, followingAnyGame } = useNotifications()

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handle = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    try { await logout() } catch {}
    navigate('/')
    window.scrollTo(0, 0)
  }

  return (
    <>
      {pendingLink && !authOpen && (
        <div className="navbar__auth-error">
          <span>Your Google account uses <strong>{pendingLink.email}</strong>, which is already registered with a password. Enter your password below to link both sign-in methods.</span>
          <button className="navbar__auth-error-close" onClick={() => { setAuthOpen(true) }}>Sign in & Link →</button>
          <button className="navbar__auth-error-close" onClick={clearPendingLink}>✕</button>
        </div>
      )}
      <nav className="navbar">
        <Link to="/" className="navbar__brand">MyGachaList</Link>

        <div className="navbar__right">
          {/* ── Support (Ko-fi) ── */}
          <a
            className="navbar__support"
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support MyGachaList on Ko-fi (opens in a new tab)"
            title="Support MyGachaList on Ko-fi"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="navbar__support-label">Support</span>
          </a>

          {showSearch && (
            <button
              className="navbar__search"
              onClick={() => setSearchOpen(true)}
              aria-label="Search games"
            >
              <span className="navbar__search-icon">⌕</span>
              <span className="navbar__search-placeholder">Search…</span>
            </button>
          )}

          {/* ── Notification bell ── */}
          <button
            className="navbar__notif-btn"
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Updates"
            title="Updates"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
              <path d="M10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
            </svg>
            {unreadCount > 0 && (
              <span className="navbar__notif-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {!loadingAuth && (
            user ? (
              <div className="navbar__user" ref={menuRef}>
                <button
                  className="navbar__profile-btn"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label="Account menu"
                  title={user.username}
                >
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.username} className="navbar__avatar-img" />
                    : <ProfileIcon />
                  }
                </button>

                {menuOpen && (
                  <div className="navbar__dropdown">
                    <div className="navbar__dropdown-user">
                      <div className="navbar__dropdown-avatar">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.username} className="navbar__dropdown-avatar-img" />
                          : <ProfileIcon />
                        }
                      </div>
                      <span className="navbar__dropdown-username" style={getRoleStyle(user.role)}>{user.username}</span>
                      <span
                        className="navbar__dropdown-role-badge"
                        style={{
                          color:      getRoleStyle(user.role).color,
                          borderColor: getRoleStyle(user.role).color,
                          boxShadow:  getRoleGlow(user.role) ? `0 0 8px ${getRoleGlow(user.role)}` : 'none',
                          textShadow: getRoleStyle(user.role).textShadow ?? 'none',
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="navbar__dropdown-divider" />
                    <Link
                      to="/account"
                      className="navbar__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="navbar__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <div className="navbar__dropdown-divider" />
                    <button
                      className="navbar__dropdown-item navbar__dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="navbar__profile-btn"
                onClick={() => setAuthOpen(true)}
                aria-label="Log in"
              >
                <ProfileIcon />
              </button>
            )
          )}
        </div>
      </nav>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      {authOpen   && <AuthModal   onClose={() => setAuthOpen(false)} />}
      {notifOpen  && (
        <NotifPanel
          items={items}
          socialItems={socialItems}
          loading={loading}
          unreadCount={unreadCount}
          lastSeen={lastSeen}
          markAllRead={markAllRead}
          followingAnyGame={followingAnyGame}
          onClose={() => setNotifOpen(false)}
        />
      )}
    </>
  )
}
