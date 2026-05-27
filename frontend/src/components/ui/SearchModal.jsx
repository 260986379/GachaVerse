import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../../data/games'
import './SearchModal.css'

const TRENDING_IDS = ['nikke', 'zenless-zone-zero']
const TRENDING = GAMES.filter((g) => TRENDING_IDS.includes(g.id))
const MORE = GAMES.filter((g) => !TRENDING_IDS.includes(g.id)).slice(0, 5)

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [hoveredGame, setHoveredGame] = useState(null)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const results = q
    ? GAMES.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.genre.toLowerCase().includes(q) ||
          g.developer?.toLowerCase().includes(q) ||
          g.tags?.some((t) => t.toLowerCase().includes(q))
      )
    : null

  const handleSelect = (gameId) => {
    navigate(`/game/${gameId}`)
    onClose()
  }

  const thumbUrl = (youtubeId) =>
    `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`

  const bannerUrl = (youtubeId) =>
    `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>

        {/* ── Main panel ── */}
        <div className="search-modal">
          <div className="search-modal__header">
            <span className="search-modal__icon">⌕</span>
            <input
              ref={inputRef}
              className="search-modal__input"
              type="text"
              placeholder="Search games..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="search-modal__close" onClick={onClose}>✕</button>
          </div>

          {!q ? (
            <>
              <div
                className="search-modal__results"
                onMouseLeave={() => setHoveredGame(null)}
              >
                <div className="search-modal__section-label">Trending</div>
                {TRENDING.map((game) => (
                  <button
                    key={game.id}
                    className={`search-modal__result${hoveredGame?.id === game.id ? ' search-modal__result--active' : ''}`}
                    onClick={() => handleSelect(game.id)}
                    onMouseEnter={() => setHoveredGame(game)}
                  >
                    <img className="search-modal__result-icon" src={thumbUrl(game.youtubeId)} alt="" draggable={false} />
                    <div className="search-modal__result-info">
                      <span className="search-modal__result-name">{game.name}</span>
                      <span className="search-modal__result-meta">{game.genre} &middot; {game.developer}</span>
                    </div>
                    <span className="search-modal__result-arrow">›</span>
                  </button>
                ))}
                <div className="search-modal__section-label">More Games</div>
                {MORE.map((game) => (
                  <button
                    key={game.id}
                    className={`search-modal__result${hoveredGame?.id === game.id ? ' search-modal__result--active' : ''}`}
                    onClick={() => handleSelect(game.id)}
                    onMouseEnter={() => setHoveredGame(game)}
                  >
                    <img className="search-modal__result-icon" src={thumbUrl(game.youtubeId)} alt="" draggable={false} />
                    <div className="search-modal__result-info">
                      <span className="search-modal__result-name">{game.name}</span>
                      <span className="search-modal__result-meta">{game.genre} &middot; {game.developer}</span>
                    </div>
                    <span className="search-modal__result-arrow">›</span>
                  </button>
                ))}
              </div>
              <div className="search-modal__footer">
                <button className="search-modal__view-more" onClick={() => { navigate('/games'); onClose() }}>
                  View all games ›
                </button>
              </div>
            </>
          ) : results.length > 0 ? (
            <>
              <div
                className="search-modal__results"
                onMouseLeave={() => setHoveredGame(null)}
              >
                {results.map((game) => (
                  <button
                    key={game.id}
                    className={`search-modal__result${hoveredGame?.id === game.id ? ' search-modal__result--active' : ''}`}
                    onClick={() => handleSelect(game.id)}
                    onMouseEnter={() => setHoveredGame(game)}
                  >
                    <img className="search-modal__result-icon" src={thumbUrl(game.youtubeId)} alt="" draggable={false} />
                    <div className="search-modal__result-info">
                      <span className="search-modal__result-name">{game.name}</span>
                      <span className="search-modal__result-meta">{game.genre} &middot; {game.developer}</span>
                    </div>
                    <span className="search-modal__result-arrow">›</span>
                  </button>
                ))}
              </div>
              <div className="search-modal__footer">
                <span className="search-modal__footer-count">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
                <button className="search-modal__view-more" onClick={() => { navigate('/games'); onClose() }}>
                  View all games ›
                </button>
              </div>
            </>
          ) : (
            <p className="search-modal__empty">No games found for &ldquo;{query}&rdquo;</p>
          )}
        </div>

        {/* ── Banner preview panel (hover) ── */}
        {hoveredGame && (
          <div className="search-modal__banner-panel">
            <div className="search-modal__banner-img-wrap">
              <img
                className="search-modal__banner-img"
                src={bannerUrl(hoveredGame.youtubeId)}
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
                {hoveredGame.tags?.map((tag) => (
                  <span key={tag} className="search-modal__banner-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
