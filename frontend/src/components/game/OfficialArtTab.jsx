import { useState, useEffect } from 'react'
import { isFavArtwork, toggleFavArtwork } from '../../utils/bookmarks'
import ImageLightbox from '../ui/ImageLightbox'

const ART_TYPE_ORDER = ['Cover Art', 'Wallpapers', 'Holiday Artwork']

export default function OfficialArtTab({ gameId }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [brokenIds, setBrokenIds] = useState(new Set())
  const [favIds, setFavIds] = useState(() => new Set())

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActive(null)
    setBrokenIds(new Set())
    fetch(`/api/games/${gameId}/art`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load art'); return r.json() })
      .then((data) => {
        setItems(data)
        setFavIds(new Set(data.filter((i) => isFavArtwork(i.id)).map((i) => i.id)))
        setLoading(false)
      })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading art...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!items.length) return <p className="tab-status">No official art yet. Check back soon.</p>

  const markBroken = (id) => setBrokenIds((prev) => new Set([...prev, id]))
  const visibleItems = items.filter((i) => !brokenIds.has(i.id))

  const handleFav = (e, item) => {
    e.stopPropagation()
    const result = toggleFavArtwork({ ...item, gameId })
    if (result !== null) {
      setFavIds((prev) => {
        const next = new Set(prev)
        result ? next.add(item.id) : next.delete(item.id)
        return next
      })
    }
  }

  const groups = ART_TYPE_ORDER
    .map((type) => ({ type, items: visibleItems.filter((i) => i.category === type) }))
    .filter((g) => g.items.length > 0)

  if (!groups.length) return <p className="tab-status">No official art yet. Check back soon.</p>

  const activeItem = active ? items.find((i) => i.id === active) : null

  return (
    <>
      <div className="art-tab">
        {groups.map(({ type, items: groupItems }) => (
          <section key={type} className="media-section">
            <h3 className="media-section__title">{type}</h3>
            <div className="art-grid">
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className="art-card"
                  onClick={() => setActive(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActive(item.id)}
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
                    <button
                      className={`art-card__fav${favIds.has(item.id) ? ' art-card__fav--on' : ''}`}
                      onClick={(e) => handleFav(e, item)}
                      title={favIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favIds.has(item.id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <p className="art-card__title">{item.title}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {activeItem && (
        <ImageLightbox
          src={activeItem.source_url || activeItem.thumbnail_url}
          title={activeItem.title}
          sourceUrl={activeItem.source_url}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}
