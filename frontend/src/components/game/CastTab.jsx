import { useState, useEffect, useRef } from 'react'

const RARITY_COLOR = { SSR: '#f0b429', SR: '#a78bfa', R: '#6b7280' }
const MAIN_FACTION = 'Main Character'

function CharacterPanel({ char, onClose }) {
  const isSplashArt = char.splash_art_urls?.length > 0
  const images = (isSplashArt ? char.splash_art_urls : [char.splash_art_url, char.icon_url]).filter(Boolean)
  const [imgIndex, setImgIndex] = useState(0)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const prev = () => setImgIndex((i) => (i - 1 + images.length) % images.length)
  const next = () => setImgIndex((i) => (i + 1) % images.length)

  return (
    <div className="char-panel" ref={panelRef}>
      <div className={`char-panel__image-side${isSplashArt ? ' char-panel__image-side--splash' : ''}`}>
        {images.length > 0 && (
          <img
            src={images[imgIndex]}
            alt={char.name}
            className={`char-panel__img${isSplashArt ? ' char-panel__img--splash' : ' char-panel__img--icon'}`}
          />
        )}
        <div className="char-panel__img-fade" />
        {images.length > 1 && (
          <div className="char-panel__cycle">
            <button className="char-panel__cycle-btn" onClick={prev}>‹</button>
            <span className="char-panel__cycle-count">{imgIndex + 1} / {images.length}</span>
            <button className="char-panel__cycle-btn" onClick={next}>›</button>
          </div>
        )}
      </div>

      <div className="char-panel__info-side">
        <button className="char-panel__close" onClick={onClose}>✕</button>

        <div className="char-panel__header">
          <h2 className="char-panel__name">{char.name}</h2>
          {char.title && <p className="char-panel__title">{char.title}</p>}
        </div>

        <div className="char-panel__va-block">
          <div className="char-panel__va-row">
            <span className="char-panel__va-label">EN Voice</span>
            <span className="char-panel__va-value">{char.voice_actor_en || '—'}</span>
          </div>
          <div className="char-panel__va-row">
            <span className="char-panel__va-label">JP Voice</span>
            <span className="char-panel__va-value">{char.voice_actor_jp || '—'}</span>
          </div>
        </div>

        <p className="char-panel__desc">{char.description}</p>
      </div>
    </div>
  )
}

export default function CastTab({ gameId }) {
  const [characters, setCharacters] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActiveId(null)
    fetch(`/api/games/${gameId}/characters`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load characters'); return r.json() })
      .then((data) => { setCharacters(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading cast...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!characters.length) return <p className="tab-status">No characters found.</p>

  const mainChars = characters.filter((c) => c.faction === MAIN_FACTION)
  const rest = characters.filter((c) => c.faction !== MAIN_FACTION)
  const factions = [...new Set(rest.map((c) => c.faction).filter(Boolean))].sort()
  const ungrouped = rest.filter((c) => !c.faction)

  const groups = [
    ...(mainChars.length ? [{ label: 'Main Characters', chars: mainChars }] : []),
    ...factions.map((f) => ({ label: f, chars: rest.filter((c) => c.faction === f) })),
    ...(ungrouped.length ? [{ label: 'Other', chars: ungrouped }] : []),
  ]

  const activeChar = activeId ? characters.find((c) => c.id === activeId) : null

  return (
    <div className="cast-tab">
      {groups.map(({ label, chars }) => {
        const activeInSection = activeChar && chars.find((c) => c.id === activeChar.id)
        return (
          <section key={label} className="cast-section">
            <div className="cast-grid">
              <h3 className="cast-section__title">{label}</h3>
              {activeInSection && (
                <div className="cast-panel-row">
                  <CharacterPanel
                    key={activeChar.id}
                    char={activeChar}
                    onClose={() => setActiveId(null)}
                  />
                </div>
              )}
              {chars.map((char) => (
                <button
                  key={char.id}
                  className={`cast-card${activeId === char.id ? ' cast-card--active' : ''}`}
                  onClick={() => setActiveId(activeId === char.id ? null : char.id)}
                >
                  <div className="cast-card__portrait">
                    {char.icon_url
                      ? <img src={char.icon_url} alt={char.name} />
                      : <div className="cast-card__fallback">{char.name[0]}</div>
                    }
                    <span
                      className="cast-card__rarity"
                      style={{ color: RARITY_COLOR[char.rarity] || '#888' }}
                    >
                      {char.rarity}
                    </span>
                  </div>
                  <p className="cast-card__name">{char.name}</p>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
