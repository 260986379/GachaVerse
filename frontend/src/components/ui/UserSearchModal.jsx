import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoleStyle } from '../../utils/roles'
import './SearchModal.css'
import './UserSearchModal.css'

const API = import.meta.env.VITE_API_URL || '/api'

export default function UserSearchModal({ onClose, initialUsers = [] }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(null)   // null = not yet searched
  const [hovered, setHovered] = useState(null)
  const navigate  = useNavigate()
  const inputRef  = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults(null); return }
    const timer = setTimeout(() => {
      fetch(`${API}/users/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(setResults)
        .catch(() => setResults([]))
    }, 220)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (username) => {
    navigate(`/u/${username}`)
    onClose()
  }

  const q = query.trim()
  const displayList = q ? (results ?? []) : initialUsers
  const searching   = q && results === null

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()}>

        {/* ── Main panel ── */}
        <div className="search-modal">
          <div className="search-modal__header">
            <span className="search-modal__icon">⌕</span>
            <input
              ref={inputRef}
              className="search-modal__input"
              type="text"
              placeholder="Search users…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="search-modal__close" onClick={onClose}>✕</button>
          </div>

          <div className="search-modal__results" onMouseLeave={() => setHovered(null)}>
            {!q && <div className="search-modal__section-label">Community</div>}
            {searching && <div className="search-modal__section-label">Searching…</div>}

            {displayList.length > 0 ? (
              displayList.map(u => (
                <button
                  key={u.id}
                  className={`search-modal__result${hovered?.id === u.id ? ' search-modal__result--active' : ''}`}
                  onClick={() => handleSelect(u.username)}
                  onMouseEnter={() => setHovered(u)}
                >
                  <div className="usm__avatar">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.username} />
                      : <span>{u.username[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className="search-modal__result-info">
                    <span className="search-modal__result-name" style={getRoleStyle(u.role)}>
                      {u.username}
                    </span>
                    <span className="search-modal__result-meta">
                      {Number(u.followers_count || 0).toLocaleString()} followers
                      {u.bio ? ` · ${u.bio.slice(0, 45)}${u.bio.length > 45 ? '…' : ''}` : ''}
                    </span>
                  </div>
                  <span className="search-modal__result-arrow">›</span>
                </button>
              ))
            ) : !searching && (
              <p className="search-modal__empty">
                {q ? `No users found for "${query}"` : 'No community members yet.'}
              </p>
            )}
          </div>

          {q && results !== null && (
            <div className="search-modal__footer">
              <span className="usm__count">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── Hovered user preview panel ── */}
        {hovered && (
          <div className="search-modal__banner-panel usm__preview">
            <div
              className="usm__preview-banner"
              style={hovered.banner_url ? { backgroundImage: `url(${hovered.banner_url})` } : undefined}
            >
              <div className="usm__preview-banner-fade" />
            </div>
            <div className="usm__preview-avatar">
              {hovered.avatar_url
                ? <img src={hovered.avatar_url} alt={hovered.username} />
                : <span>{hovered.username[0].toUpperCase()}</span>
              }
            </div>
            <div className="search-modal__banner-info">
              <p className="search-modal__banner-name" style={getRoleStyle(hovered.role)}>
                {hovered.username}
              </p>
              <p className="search-modal__banner-genre">
                {Number(hovered.followers_count || 0).toLocaleString()} followers
              </p>
              {hovered.bio && (
                <p className="search-modal__banner-desc">{hovered.bio}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
