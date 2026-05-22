import { useState, useEffect } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'

const TYPE_ORDER = ['Trailer', 'Cinematic', 'Character Demo', 'Music']
const TYPE_LABELS = {
  'Trailer': 'Trailers',
  'Cinematic': 'Cinematics',
  'Character Demo': 'Character Demos',
  'Music': 'Music',
}

export default function MediaTab({ gameId }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [brokenIds, setBrokenIds] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActive(null)
    setBrokenIds(new Set())
    fetch(`/api/games/${gameId}/media`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load media'); return r.json() })
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading media...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!items.length) return <p className="tab-status">No media yet. Check back soon.</p>

  const markBroken = (id) => setBrokenIds((prev) => new Set([...prev, id]))
  const visibleItems = items.filter((i) => !brokenIds.has(i.id))

  const groups = TYPE_ORDER
    .map((type) => ({ type, videos: visibleItems.filter((i) => i.category === type) }))
    .filter((g) => g.videos.length > 0)

  if (!groups.length) return <p className="tab-status">No media yet. Check back soon.</p>

  return (
    <div className="media-tab">
      {groups.map(({ type, videos }) => {
        const activeInSection = active ? videos.find((v) => v.id === active) : null
        return (
          <section key={type} className="media-section">
            <h3 className="media-section__title">{TYPE_LABELS[type] ?? type}</h3>
            {activeInSection && (
              <div className="media-tab__player">
                <YouTubeEmbed videoId={activeInSection.external_id} title={activeInSection.title} />
                <h3 className="media-tab__player-title">{activeInSection.title}</h3>
                {activeInSection.description && (
                  <p className="media-tab__player-desc">{activeInSection.description}</p>
                )}
                <button className="media-tab__close" onClick={() => setActive(null)}>✕ Close</button>
              </div>
            )}
            <div className="media-grid">
              {videos.map((item) => (
                <button
                  key={item.id}
                  className={`media-card${active === item.id ? ' media-card--active' : ''}`}
                  onClick={() => setActive(active === item.id ? null : item.id)}
                >
                  <div className="media-card__thumb">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        loading="lazy"
                        onError={() => markBroken(item.id)}
                      />
                    ) : (
                      <div className="media-card__thumb-fallback" />
                    )}
                    <div className="media-card__play">▶</div>
                  </div>
                  <p className="media-card__title">{item.title}</p>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
