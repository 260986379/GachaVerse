import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../../data/games'
import { useAuth } from '../../context/AuthContext'
import { getRoleStyle } from '../../utils/roles'
import './SearchModal.css'
import './UserSearchModal.css'

const TRENDING_IDS = ['nikke', 'zenless-zone-zero']
const TRENDING = GAMES.filter((g) => TRENDING_IDS.includes(g.id))
const MORE     = GAMES.filter((g) => !TRENDING_IDS.includes(g.id)).slice(0, 5)
const API      = import.meta.env.VITE_API_URL || '/api'

export default function SearchModal({ onClose, initialMode = 'games', initialUsers = [] }) {
  const [mode,          setMode]          = useState(initialMode)  // 'games' | 'users'
  const [query,         setQuery]         = useState('')
  const [hoveredGame,   setHoveredGame]   = useState(null)
  const [hoveredUser,   setHoveredUser]   = useState(null)
  const [userResults,   setUserResults]   = useState(null)   // null = not yet searched
  const [directoryList, setDirectoryList] = useState(initialUsers)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const { isLoggedIn, authFetch } = useAuth()

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const switchMode = (m) => {
    if (m === mode) return
    setMode(m)
    setQuery('')
    setHoveredGame(null)
    setHoveredUser(null)
    setUserResults(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Load directory the first time users mode is active and no list was pre-provided
  useEffect(() => {
    if (mode !== 'users' || directoryList.length > 0) return
    const fetchFn = isLoggedIn ? authFetch : fetch
    fetchFn(`${API}/users/directory`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setDirectoryList(data) })
      .catch(() => {})
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced user search
  useEffect(() => {
    if (mode !== 'users') return
    const q = query.trim()
    if (!q) { setUserResults(null); return }
    const fetchFn = isLoggedIn ? authFetch : fetch
    const timer = setTimeout(() => {
      fetchFn(`${API}/users/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(setUserResults)
        .catch(() => setUserResults([]))
    }, 220)
    return () => clearTimeout(timer)
  }, [query, mode, isLoggedIn])

  const handleSelectGame = (gameId) => { navigate(`/game/${gameId}`); onClose() }
  const handleSelectUser = (username) => { navigate(`/u/${username}`); onClose() }

  const thumbUrl  = (game) => game.posterImage ?? `https://img.youtube.com/vi/${game.youtubeId}/mqdefault.jpg`
  const bannerUrl = (game) => game.posterImage ?? `https://img.youtube.com/vi/${game.youtubeId}/hqdefault.jpg`

  const q = query.trim().toLowerCase()

  // ── Game results ──────────────────────────────────────────────────────────
  const gameResults = q
    ? GAMES.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.developer?.toLowerCase().includes(q) ||
        g.tags?.some(t => t.toLowerCase().includes(q))
      )
    : null

  // ── User results ──────────────────────────────────────────────────────────
  const userDisplayList  = q ? (userResults ?? []) : directoryList
  const searchingUsers   = mode === 'users' && !!q && userResults === null

  const GameRow = ({ game }) => (
    <button
      key={game.id}
      className={`search-modal__result${hoveredGame?.id === game.id ? ' search-modal__result--active' : ''}`}
      onClick={() => handleSelectGame(game.id)}
      onMouseEnter={() => setHoveredGame(game)}
    >
      <img className="search-modal__result-icon" src={thumbUrl(game)} alt="" draggable={false} />
      <div className="search-modal__result-info">
        <span className="search-modal__result-name">{game.name}</span>
        <span className="search-modal__result-meta">{game.genre} &middot; {game.developer}</span>
      </div>
      <span className="search-modal__result-arrow">›</span>
    </button>
  )

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()}>
      <div className="search-modal-anchor">

        {/* ── Main panel ── */}
        <div className="search-modal">

          {/* Header */}
          <div className="search-modal__header">
            <span className="search-modal__icon">⌕</span>

            {/* Mode toggle pill */}
            <div className="search-modal__toggle">
              <button
                className={`search-modal__toggle-btn${mode === 'games' ? ' search-modal__toggle-btn--active' : ''}`}
                onClick={() => switchMode('games')}
              >Games</button>
              <button
                className={`search-modal__toggle-btn${mode === 'users' ? ' search-modal__toggle-btn--active' : ''}`}
                onClick={() => switchMode('users')}
              >Users</button>
            </div>

            <input
              ref={inputRef}
              className="search-modal__input"
              type="text"
              placeholder={mode === 'games' ? 'Search games...' : 'Search users…'}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="search-modal__close" onClick={onClose}>✕</button>
          </div>

          {/* ── Games mode ── */}
          {mode === 'games' && (
            gameResults === null ? (
              <>
                <div className="search-modal__results" onMouseLeave={() => setHoveredGame(null)}>
                  <div className="search-modal__section-label">Trending</div>
                  {TRENDING.map(g => <GameRow key={g.id} game={g} />)}
                  <div className="search-modal__section-label">More Games</div>
                  {MORE.map(g => <GameRow key={g.id} game={g} />)}
                </div>
                <div className="search-modal__footer">
                  <button className="search-modal__view-more" onClick={() => { navigate('/games'); onClose() }}>
                    View all games ›
                  </button>
                </div>
              </>
            ) : gameResults.length > 0 ? (
              <>
                <div className="search-modal__results" onMouseLeave={() => setHoveredGame(null)}>
                  {gameResults.map(g => <GameRow key={g.id} game={g} />)}
                </div>
                <div className="search-modal__footer">
                  <span className="search-modal__footer-count">
                    {gameResults.length} result{gameResults.length !== 1 ? 's' : ''}
                  </span>
                  <button className="search-modal__view-more" onClick={() => { navigate('/games'); onClose() }}>
                    View all games ›
                  </button>
                </div>
              </>
            ) : (
              <p className="search-modal__empty">No games found for &ldquo;{query}&rdquo;</p>
            )
          )}

          {/* ── Users mode ── */}
          {mode === 'users' && (
            <>
              <div className="search-modal__results" onMouseLeave={() => setHoveredUser(null)}>
                {!q && <div className="search-modal__section-label">Community</div>}
                {searchingUsers && <div className="search-modal__section-label">Searching…</div>}

                {userDisplayList.length > 0 ? (
                  userDisplayList.map(u => (
                    <button
                      key={u.id}
                      className={`search-modal__result${hoveredUser?.id === u.id ? ' search-modal__result--active' : ''}`}
                      onClick={() => handleSelectUser(u.username)}
                      onMouseEnter={() => setHoveredUser(u)}
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
                ) : !searchingUsers && (
                  <p className="search-modal__empty">
                    {q ? `No users found for "${query}"` : 'No community members yet.'}
                  </p>
                )}
              </div>

              <div className="search-modal__footer">
                {q && userResults !== null && (
                  <span className="usm__count">
                    {userResults.length} result{userResults.length !== 1 ? 's' : ''}
                  </span>
                )}
                <button className="search-modal__view-more" onClick={() => { navigate('/community'); onClose() }}>
                  View all users ›
                </button>
              </div>
            </>
          )}

        </div>

        {/* ── Game hover preview ── */}
        {mode === 'games' && hoveredGame && (
          <div className="search-modal__banner-panel">
            <div className="search-modal__banner-img-wrap">
              <img
                className="search-modal__banner-img"
                src={bannerUrl(hoveredGame)}
                alt={hoveredGame.name}
                draggable={false}
              />
              <div
                className="search-modal__banner-gradient"
                style={{ background: `linear-gradient(to top, ${hoveredGame.color2 ?? '#000'} 0%, transparent 60%)` }}
              />
            </div>
            <div className="search-modal__banner-info">
              <p className="search-modal__banner-name">{hoveredGame.name}</p>
              <p className="search-modal__banner-genre">{hoveredGame.genre} &middot; {hoveredGame.developer}</p>
              {hoveredGame.description && (
                <p className="search-modal__banner-desc">{hoveredGame.description}</p>
              )}
              <div className="search-modal__banner-tags">
                {hoveredGame.tags?.map(tag => (
                  <span key={tag} className="search-modal__banner-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── User hover preview ── */}
        {mode === 'users' && hoveredUser && (
          <div className="search-modal__banner-panel usm__preview">
            <div
              className="usm__preview-banner"
              style={hoveredUser.banner_url ? { backgroundImage: `url(${hoveredUser.banner_url})` } : undefined}
            >
              <div className="usm__preview-banner-fade" />
            </div>
            <div className="usm__preview-avatar">
              {hoveredUser.avatar_url
                ? <img src={hoveredUser.avatar_url} alt={hoveredUser.username} />
                : <span>{hoveredUser.username[0].toUpperCase()}</span>
              }
            </div>
            <div className="search-modal__banner-info">
              <p className="search-modal__banner-name" style={getRoleStyle(hoveredUser.role)}>
                {hoveredUser.username}
              </p>
              <p className="search-modal__banner-genre">
                {Number(hoveredUser.followers_count || 0).toLocaleString()} followers
              </p>
              {hoveredUser.bio && (
                <p className="search-modal__banner-desc">{hoveredUser.bio}</p>
              )}
            </div>
          </div>
        )}

      </div>
      </div>
    </div>
  )
}
