import { useState, useEffect } from 'react'

const RARITY_COLOR = { SSR: '#f0b429', SR: '#a78bfa', R: '#6b7280' }

export default function CastTab({ gameId }) {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/games/${gameId}/characters`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load characters'); return r.json() })
      .then((data) => { setCharacters(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading cast...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!characters.length) return <p className="tab-status">No characters found.</p>

  return (
    <div className="cast-grid">
      {characters.map((char) => (
        <div key={char.id} className="cast-card">
          <div className="cast-card__portrait">
            {char.icon_url ? (
              <img
                src={char.icon_url}
                alt={char.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <div className="cast-card__fallback" style={{ display: char.icon_url ? 'none' : 'flex' }}>
              {char.name[0]}
            </div>
          </div>
          <div className="cast-card__info">
            <div className="cast-card__top">
              <span className="cast-card__name">{char.name}</span>
              <span
                className="cast-card__rarity"
                style={{ color: RARITY_COLOR[char.rarity] || '#888' }}
              >
                {char.rarity}
              </span>
            </div>
            <span className="cast-card__element">{char.element_type}</span>
            <p className="cast-card__desc">{char.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
