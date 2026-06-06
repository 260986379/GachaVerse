import { useState, useEffect, useRef } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'
import { isFavVideo, toggleFavVideo, getFavVideos } from '../../utils/bookmarks'
import { useAuth } from '../../context/AuthContext'

const TYPE_ORDER_BY_GAME = {
  'zenless-zone-zero': ['Lore', 'Trailer', 'Character Demo', 'Cinematic', 'Music'],
  'nikke': ['Lore', 'Main Story', 'Opening', 'Animation', 'Promotional', 'Character Demo', 'Music', 'Costume Showcase', 'Anniversary', 'Collaboration', 'ASMR'],
  'genshin-impact':    ['Main Story', 'Character Demo', 'Trailer', 'Cinematic', 'Animation', 'Music'],
  'wuthering-waves':   ['Main Story', 'Resonator Showcase', 'Cinematic', 'Animation', 'Music', 'Midnight Podcast', 'Collaboration'],
  'honkai-star-rail':  ['Main Story', 'Character Demo', 'Animation', 'Myriad Celestia', 'Music', 'Collaboration'],
}
const DEFAULT_TYPE_ORDER = ['Lore', 'Main Story', 'Opening', 'Animation', 'Promotional', 'Anniversary', 'Music', 'Character Demo', 'Collaboration', 'ASMR', 'Trailer', 'Cinematic']
const TYPE_LABELS = {
  'Main Story': 'Main Story Chapters',
  'Opening': 'Openings',
  'Animation': 'Animations',
  'Promotional': 'Promotional Videos',
  'Anniversary': 'Anniversary',
  'Music': 'Music/BGM',
  'Character Demo': 'Character Demos',
  'Collaboration': 'Collaborations',
  'ASMR': 'ASMR',
  'Lore': 'Lore',
  'Trailer': 'Trailers',
  'Cinematic': 'Cinematics',
  'Resonator Showcase': 'Resonator Showcase',
  'Midnight Podcast': 'Midnight Podcast',
  'Myriad Celestia': 'Myriad Celestia',
  'Costume Showcase': 'Costume Showcase',
}

const TYPE_LABELS_BY_GAME = {
  'genshin-impact':   { 'Main Story': 'Main Story Updates' },
  'wuthering-waves':  { 'Main Story': 'Main Story Updates' },
  'honkai-star-rail': { 'Main Story': 'Main Story Updates' },
}

// Strip channel branding at render time — raw titles are stored in the DB.
// Each game has its own branding convention:
//   NIKKE    → prefix  "GODDESS OF VICTORY: NIKKE | Title"
//   WW       → wrap    "Wuthering Waves | Content | Wuthering Waves..."
//   others   → suffix  "Title | Channel Name"
const displayTitle = (title, gameId) => {
  if (!title) return title
  if (gameId === 'nikke') {
    return title.replace(/^GODDESS OF VICTORY:\s*NIKKE\s*\|\s*/i, '').trim()
  }
  if (gameId === 'wuthering-waves') {
    return title
      .replace(/\s*\|\s*Wuthering Waves\b.*$/i, '')
      .replace(/^Wuthering Waves\s*\|\s*/i, '')
      .trim()
  }
  // ZZZ, Genshin, HSR, etc. — strip trailing "| Channel Name"
  return title.replace(/\s*\|[^|]*$/, '').trim()
}

export default function MediaTab({ gameId, initialVideoId = null }) {
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
  const { isLoggedIn, authFetch } = useAuth()

  const refreshFavs = () => setFavIds(new Set(getFavVideos().map((v) => v.id)))

  // On mount: if logged in, load server favorites (so they stay in sync across devices)
  useEffect(() => {
    if (!isLoggedIn) { refreshFavs(); return }
    authFetch('/api/videos/favorites')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setFavIds(new Set(data.map(v => v.id)))
        else refreshFavs()
      })
      .catch(refreshFavs)
  }, [isLoggedIn])

  const [favLimitHit, setFavLimitHit] = useState(false)

  const handleFav = async (e, item) => {
    e.stopPropagation()
    // Optimistic local update
    const result = toggleFavVideo(item)
    if (result === null) {
      setFavLimitHit(true)
      setTimeout(() => setFavLimitHit(false), 2000)
      return
    }
    refreshFavs()
    // DB sync is handled inside toggleFavVideo via bookmarks.js (_authFetch)
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
    if (window.matchMedia('(max-width: 640px)').matches) {
      window.open(`https://www.youtube.com/watch?v=${item.external_id}`, '_blank', 'noopener,noreferrer')
      return
    }
    setActive(active === item.id ? null : item.id)
  }


  useEffect(() => {
    if (active && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [active])

  // React to a new initialVideoId when already on this game page
  // (items are already loaded; the fetch effect handles the fresh-navigation case)
  useEffect(() => {
    if (!initialVideoId || !items.length) return
    const target = items.find(v => v.external_id === initialVideoId)
    if (target) {
      setActive(target.id)
      setExpandedSection(target.category)
    }
  }, [initialVideoId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActive(null)
    setBrokenIds(new Set())
    setExpandedSection(null)
    fetch(`/api/games/${gameId}/media`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load media'); return r.json() })
      .then((fetched) => {
        setItems(fetched)
        setLoading(false)
        if (initialVideoId) {
          const target = fetched.find(v => v.external_id === initialVideoId)
          if (target) {
            setActive(target.id)
            setExpandedSection(target.category)
          }
        }
      })
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

  const groups = (TYPE_ORDER_BY_GAME[gameId] || DEFAULT_TYPE_ORDER)
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
              <p className="media-card__title">{displayTitle(item.title, gameId)}</p>
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
              <h3 className="media-section__title">{TYPE_LABELS_BY_GAME[gameId]?.[type] ?? TYPE_LABELS[type] ?? type}</h3>
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
                <YouTubeEmbed videoId={activeInSection.external_id} title={activeInSection.title} thumbnailUrl={activeInSection.thumbnail_url} />
                <h3 className="media-tab__player-title">{displayTitle(activeInSection.title, gameId)}</h3>
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
