import { useState, useEffect } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'

export default function MediaTab({ gameId }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActive(null)
    fetch(`/api/games/${gameId}/media`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load media'); return r.json() })
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading media...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!items.length) return <p className="tab-status">No media yet. Check back soon.</p>

  const selected = active ? items.find((i) => i.id === active) : null

  return (
    <div className="media-tab">
      {selected && (
        <div className="media-tab__player">
          <YouTubeEmbed videoId={selected.external_id} title={selected.title} />
          <h3 className="media-tab__player-title">{selected.title}</h3>
          {selected.description && (
            <p className="media-tab__player-desc">{selected.description}</p>
          )}
          <button className="media-tab__close" onClick={() => setActive(null)}>✕ Close</button>
        </div>
      )}

      <div className="media-grid">
        {items.map((item) => (
          <button
            key={item.id}
            className={`media-card${active === item.id ? ' media-card--active' : ''}`}
            onClick={() => setActive(active === item.id ? null : item.id)}
          >
            <div className="media-card__thumb">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.title} loading="lazy" />
              ) : (
                <div className="media-card__thumb-fallback" />
              )}
              <div className="media-card__play">▶</div>
            </div>
            <p className="media-card__title">{item.title}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
