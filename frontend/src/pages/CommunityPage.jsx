import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleStyle } from '../utils/roles'
import { displayRole } from '../utils/membership'
import './CommunityPage.css'

const API = import.meta.env.VITE_API_URL || '/api'

function UserGridCard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="cpage-card" onClick={() => navigate(`/u/${user.username}`)}>
      <div
        className="cpage-card__banner"
        style={user.banner_url ? { backgroundImage: `url(${user.banner_url})` } : undefined}
      />
      <div className="cpage-card__body">
        <div className="cpage-card__avatar">
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.username} />
            : <span>{user.username[0].toUpperCase()}</span>
          }
        </div>
        <p className="cpage-card__name" style={getRoleStyle(displayRole(user))}>
          {user.username}
        </p>
        <p className="cpage-card__followers">
          {Number(user.followers_count || 0).toLocaleString()} followers
        </p>
        {user.bio && (
          <p className="cpage-card__bio">{user.bio}</p>
        )}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  const [allUsers, setAllUsers] = useState(null)
  const [query,    setQuery]    = useState('')
  const { isLoggedIn, loadingAuth, authFetch } = useAuth()

  useEffect(() => {
    if (loadingAuth) return
    window.scrollTo(0, 0)
    const fetchFn = isLoggedIn ? authFetch : fetch
    fetchFn(`${API}/users/directory`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]))
  }, [loadingAuth, isLoggedIn])

  const isLoading = allUsers === null
  const q = query.trim().toLowerCase()
  const displayed = q && allUsers
    ? allUsers.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.bio?.toLowerCase().includes(q)
      )
    : allUsers ?? []

  const countLabel = isLoading
    ? '…'
    : q
      ? `${displayed.length} result${displayed.length !== 1 ? 's' : ''}`
      : `${allUsers.length} member${allUsers.length !== 1 ? 's' : ''}`

  return (
    <div className="cpage">

      {/* ── Header ── */}
      <div className="cpage-header">
        <div className="cpage-header__top">
          <h1 className="cpage-header__title">Community</h1>
          <span className="cpage-header__count">{countLabel}</span>
        </div>

        <div className="cpage-search">
          <span className="cpage-search__icon">⌕</span>
          <input
            className="cpage-search__input"
            type="search"
            placeholder="Search users…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="cpage-content">
        {isLoading ? (
          <p className="cpage-empty">Loading…</p>
        ) : displayed.length === 0 ? (
          <p className="cpage-empty">
            {q ? `No users found for "${query}"` : 'No community members yet.'}
          </p>
        ) : (
          <div className="cpage-grid">
            {displayed.map(u => (
              <UserGridCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
