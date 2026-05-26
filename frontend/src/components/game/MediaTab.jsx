import { useState, useEffect, useRef } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'
import { isFavVideo, toggleFavVideo, getFavVideos } from '../../utils/bookmarks'

const TYPE_ORDER = ['Main Story', 'Opening', 'Anniversary', 'Collaboration', 'Lore', 'Trailer', 'Cinematic', 'Character Demo', 'Music', 'Animation', 'ASMR', 'Promotional']
const TYPE_LABELS = {
  'Main Story': 'Main Story Chapters',
  'Opening': 'Openings',
  'Anniversary': 'Anniversary',
  'Collaboration': 'Collaborations',
  'Lore': 'Lore',
  'Trailer': 'Trailers',
  'Cinematic': 'Cinematics',
  'Character Demo': 'Character Demos',
  'Music': 'Music',
  'Animation': 'Animation',
  'ASMR': 'ASMR',
  'Promotional': 'Promotional Videos',
}

export default function MediaTab({ gameId }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [brokenIds, setBrokenIds] = useState(new Set())
  const [expandedSection, setExpandedSection] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [favIds, setFavIds] = useState(() => new Set())
  const playerRef = useRef(null)
  const dragRef = useRef(null)
  const didDragRef = useRef(false)

  const refreshFavs = () => setFavIds(new Set(getFavVideos().map((v) => v.id)))

  useEffect(refreshFavs, [])

  const [favLimitHit, setFavLimitHit] = useState(false)

  const handleFav = (e, item) => {
    e.stopPropagation()
    const result = toggleFavVideo(item)
    if (result === null) {
      setFavLimitHit(true)
      setTimeout(() => setFavLimitHit(false), 2000)
      return
    }
    refreshFavs()
  }

  const toggleExpanded = (type) =>
    setExpandedSection((prev) => (prev === type ? null : type))

  const handleDragStart = (e) => {
    didDragRef.current = false
    dragRef.current = { el: e.currentTarget, startX: e.pageX, scrollLeft: e.currentTarget.scrollLeft }
  }

  const handleDragMove = (e) => {
    if (!dragRef.current) return
    const dx = e.pageX - dragRef.current.startX
    if (Math.abs(dx) > 4) didDragRef.current = true
    dragRef.current.el.scrollLeft = dragRef.current.scrollLeft - dx
  }

  const handleDragEnd = () => {
    dragRef.current = null
    // didDragRef intentionally NOT cleared here — click fires after mouseup and reads it
  }

  const handleCardClick = (item) => {
    if (didDragRef.current) { didDragRef.current = false; return }
    setActive(active === item.id ? null : item.id)
  }


  useEffect(() => {
    if (active && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [active])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActive(null)
    setBrokenIds(new Set())
    setExpandedSection(null)
    fetch(`/api/games/${gameId}/media`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load media'); return r.json() })
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading media...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!items.length) return <p className="tab-status">No media yet. Check back soon.</p>

  const markBroken = (id) => setBrokenIds((prev) => new Set([...prev, id]))

  const q = search.trim().toLowerCase()
  const processedItems = items
    .filter((i) => !brokenIds.has(i.id))
    .filter((i) => !q || i.title?.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === 'popular') return (Number(b.view_count) || 0) - (Number(a.view_count) || 0)
      if (sort === 'oldest') return new Date(a.published_at) - new Date(b.published_at)
      return new Date(b.published_at) - new Date(a.published_at)
    })

  const groups = TYPE_ORDER
    .map((type) => ({ type, videos: processedItems.filter((i) => i.category === type) }))
    .filter((g) => g.videos.length > 0)

  return (
    <div className="media-tab">
      {favLimitHit && (
        <div className="fav-limit-toast">Favorite limit reached (10 max)</div>
      )}
      <div className="media-toolbar">
        <div className="media-search-wrap">
          <span className="media-search-icon">⌕</span>
          <input
            className="media-search"
            type="search"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="media-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="popular">Most Viewed</option>
        </select>
      </div>
      {groups.length === 0 && (
        <p className="tab-status">{search ? 'No videos match your search.' : 'No media yet. Check back soon.'}</p>
      )}
      {groups.map(({ type, videos }) => {
        const activeInSection = active ? videos.find((v) => v.id === active) : null
        const isExpanded = expandedSection === type

        const videoCards = videos.map((item) => (
          <div key={item.id} className="media-card-wrap">
            <button
              className={`media-card${active === item.id ? ' media-card--active' : ''}`}
              onClick={() => handleCardClick(item)}
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
            <button
              className={`media-card__fav${favIds.has(item.id) ? ' media-card__fav--on' : ''}`}
              onClick={(e) => handleFav(e, item)}
              title={favIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favIds.has(item.id) ? '♥' : '♡'}
            </button>
          </div>
        ))

        return (
          <section key={type} className="media-section">
            <div className="media-section__header">
              <h3 className="media-section__title">{TYPE_LABELS[type] ?? type}</h3>
              {videos.length > 3 && (
                <button
                  className="media-section__expand-btn"
                  onClick={() => toggleExpanded(type)}
                >
                  {isExpanded ? 'Collapse' : `Show all ${videos.length}`}
                </button>
              )}
            </div>
            {activeInSection && (
              <div className="media-tab__player" ref={playerRef}>
                <YouTubeEmbed videoId={activeInSection.external_id} title={activeInSection.title} />
                <h3 className="media-tab__player-title">{activeInSection.title}</h3>
                <button className="media-tab__close" onClick={() => setActive(null)}>✕ Close</button>
              </div>
            )}
            {isExpanded ? (
              <div className="media-grid">{videoCards}</div>
            ) : (
              <div
                className="media-row"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {videoCards}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
