import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleStyle } from '../utils/roles'
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
        <p className="cpage-card__name" style={getRoleStyle(user.role)}>
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
  const [query,      setQuery]      = useState('')
  const [allUsers,   setAllUsers]   = useState(null)
  const [results,    setResults]    = useState(null)   // null = not yet searched
  const inputRef = useRef(null)
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

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults(null); return }
    const fetchFn = isLoggedIn ? authFetch : fetch
    const timer = setTimeout(() => {
      fetchFn(`${API}/users/search?q=${encodeURIComponent(q)}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
        .then(data => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
    }, 220)
    return () => clearTimeout(timer)
  }, [query, isLoggedIn])

  const q            = query.trim()
  const displayUsers = q ? (results ?? []) : (allUsers ?? [])
  const isLoading    = !q && allUsers === null
  const isSearching  = !!q && results === null

  const countLabel = isLoading || isSearching
    ? '…'
    : `${displayUsers.length} ${q ? 'result' : 'member'}${displayUsers.length !== 1 ? 's' : ''}`

  return (
    <div className="cpage">

      {/* ── Header ── */}
      <div className="cpage-header">
        <div className="cpage-header__top">
          <h1 className="cpage-header__title">Community</h1>
          <span className="cpage-header__count">{countLabel}</span>
        </div>

        {/* Search bar */}
        <div className="cpage-search">
          <span className="cpage-search__icon">⌕</span>
          <input
            ref={inputRef}
            className="cpage-search__input"
            type="text"
            placeholder="Search users…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="cpage-search__clear"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="cpage-content">
        {isLoading ? (
          <p className="cpage-empty">Loading…</p>
        ) : displayUsers.length === 0 ? (
          <p className="cpage-empty">
            {q ? `No users found for "${query}".` : 'No community members yet.'}
          </p>
        ) : (
          <div className="cpage-grid">
            {displayUsers.map(u => (
              <UserGridCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
