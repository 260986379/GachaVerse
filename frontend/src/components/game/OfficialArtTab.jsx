import { useState, useEffect, useRef } from 'react'

const ART_TYPE_ORDER = ['Cover Art', 'Wallpapers', 'Holiday Artwork']

export default function OfficialArtTab({ gameId }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [brokenIds, setBrokenIds] = useState(new Set())
  const viewerRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const handleClickOutside = (e) => {
      if (viewerRef.current && !viewerRef.current.contains(e.target)) {
        setActive(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [active])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActive(null)
    setBrokenIds(new Set())
    fetch(`/api/games/${gameId}/art`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load art'); return r.json() })
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading art...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!items.length) return <p className="tab-status">No official art yet. Check back soon.</p>

  const markBroken = (id) => setBrokenIds((prev) => new Set([...prev, id]))
  const visibleItems = items.filter((i) => !brokenIds.has(i.id))

  const groups = ART_TYPE_ORDER
    .map((type) => ({ type, items: visibleItems.filter((i) => i.category === type) }))
    .filter((g) => g.items.length > 0)

  if (!groups.length) return <p className="tab-status">No official art yet. Check back soon.</p>

  const selected = active ? items.find((i) => i.id === active) : null

  return (
    <div className="art-tab">
      {groups.map(({ type, items: groupItems }) => {
        const activeInSection = active ? groupItems.find((i) => i.id === active) : null
        return (
          <section key={type} className="media-section">
            <h3 className="media-section__title">{type}</h3>
            {activeInSection && (
              <div className="art-tab__viewer" ref={viewerRef}>
                <img
                  src={activeInSection.source_url || activeInSection.thumbnail_url}
                  alt={activeInSection.title}
                  className="art-tab__viewer-img"
                />
                <div className="art-tab__viewer-meta">
                  <p className="art-tab__viewer-title">{activeInSection.title}</p>
                  <button className="media-tab__close" onClick={() => setActive(null)}>✕ Close</button>
                </div>
              </div>
            )}
            <div className="art-grid">
              {groupItems.map((item) => (
                <button
                  key={item.id}
                  className={`art-card${active === item.id ? ' art-card--active' : ''}`}
                  onClick={() => setActive(active === item.id ? null : item.id)}
                >
                  <div className="art-card__thumb">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        loading="lazy"
                        onError={() => markBroken(item.id)}
                      />
                    ) : (
                      <div className="art-card__thumb-fallback" />
                    )}
                  </div>
                  <p className="art-card__title">{item.title}</p>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
