import { useState, useEffect, useRef } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'
import { isFavChar, toggleFavChar, getFavChars } from '../../utils/bookmarks'

const RARITY_COLOR  = { SSR: '#f0b429', SR: '#a78bfa' }
const RARITY_LABEL  = { SSR: '5★  S-Rank', SR: '4★  A-Rank' }
const ELEMENT_COLOR = {
  Physical: '#d4c9b8',
  Electric: '#7fc8ff',
  Fire:     '#ff8c42',
  Ice:      '#7ecfed',
  Ether:    '#c4a0f0',
}
const TYPE_COLOR = {
  Attack:  '#e05555',
  Stun:    '#e8b84b',
  Anomaly: '#c070e0',
  Support: '#5bad6f',
  Defense: '#5b8fe0',
  Rupture: '#d46030',
}

function getRelatedVideos(char, media) {
  if (!char || !media.length) return []
  const terms = new Set()
  ;[char.display_name, char.name].filter(Boolean).forEach((n) => {
    terms.add(n.toLowerCase())
    if (n.includes(':')) terms.add(n.split(':')[1].trim().toLowerCase())
  })
  return media.filter((v) => {
    // Tags are the authoritative match — if any tag matches, include it
    if (v.tags?.length) {
      const tagMatch = v.tags.some((tag) =>
        [...terms].some((term) => term.length > 1 && tag.toLowerCase().includes(term))
      )
      if (tagMatch) return true
    }
    // Fall back to title matching for untagged videos
    const t = (v.title || '').toLowerCase()
    return [...terms].some((term) => term.length > 1 && t.includes(term))
  })
}

function StatRow({ label, value, color }) {
  return (
    <div className="char-panel__stat">
      <span className="char-panel__stat-label">{label}</span>
      <span className="char-panel__stat-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  )
}

function CharacterPanel({ char, onClose, relatedVideos, gameSlug, onFavLimit }) {
  const isSplashArt = char.splash_art_urls?.length > 0
  const images = (isSplashArt ? char.splash_art_urls : [char.splash_art_url, char.icon_url]).filter(Boolean)
  const [imgIndex, setImgIndex] = useState(0)
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [faved, setFaved] = useState(() => isFavChar(char.id))

  const handleFav = () => {
    const nowFaved = toggleFavChar({ ...char, game_slug: gameSlug })
    if (nowFaved === null) { onFavLimit?.(); return }
    setFaved(nowFaved)
  }

  const prev = () => setImgIndex((i) => (i - 1 + images.length) % images.length)
  const next = () => setImgIndex((i) => (i + 1) % images.length)

  return (
    <div className="char-panel">
      <div className="char-panel__top">
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
          <div className="char-panel__top-btns">
            <button
              className={`char-panel__fav${faved ? ' char-panel__fav--on' : ''}`}
              onClick={handleFav}
              title={faved ? 'Remove from favorites' : 'Add to favorites'}
            >
              {faved ? '♥' : '♡'}
            </button>
            <button className="char-panel__close" onClick={onClose}>✕</button>
          </div>

          <div className="char-panel__header">
            <h2 className="char-panel__name">{char.name}</h2>
            {char.title && <p className="char-panel__title">{char.title}</p>}
          </div>

          <div className="char-panel__stats">
            <StatRow label="Rarity"  value={RARITY_LABEL[char.rarity] || char.rarity || '—'} color={RARITY_COLOR[char.rarity]} />
            <StatRow label="Season"  value={char.season ? `Season ${char.season}` : '—'} />
            <StatRow label="Element" value={char.element_type || '—'} color={ELEMENT_COLOR[char.element_type]} />
            <StatRow label="Type"    value={char.combat_type  || '—'} color={TYPE_COLOR[char.combat_type]} />
            {char.faction && char.faction !== 'Main Character' && (
              <div className="char-panel__stat char-panel__stat--full">
                <span className="char-panel__stat-label">Faction</span>
                <span className="char-panel__stat-value">{char.faction}</span>
              </div>
            )}
            {char.special_type && (
              <div className="char-panel__stat char-panel__stat--full">
                <span className="char-panel__stat-label">Special</span>
                <span className="char-panel__stat-value" style={{ color: '#c4a0f0' }}>{char.special_type}</span>
              </div>
            )}
          </div>

          {char.description && <p className="char-panel__desc">{char.description}</p>}
        </div>
      </div>

      {relatedVideos?.length > 0 && (
        <div className="char-panel__related">
          <h4 className="char-panel__related-title">Related Videos</h4>
          <div className="char-panel__related-body">
            <div className="char-panel__video-row">
              {relatedVideos.map((v) => (
                <button
                  key={v.id}
                  className={`char-panel__video-card${activeVideoId === v.external_id ? ' char-panel__video-card--active' : ''}`}
                  onClick={() => setActiveVideoId(activeVideoId === v.external_id ? null : v.external_id)}
                >
                  <div className="char-panel__video-thumb">
                    {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} loading="lazy" />}
                    <div className="char-panel__video-play">▶</div>
                  </div>
                  <p className="char-panel__video-name">{v.title}</p>
                </button>
              ))}
            </div>
            {activeVideoId && (
              <div className="char-panel__related-player">
                <YouTubeEmbed videoId={activeVideoId} title="" />
                <button className="char-panel__related-close" onClick={() => setActiveVideoId(null)}>✕ Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CastFilter({ label, value, onChange, options, renderOption }) {
  return (
    <select className="cast-filter" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">{label}</option>
      {options.map((o) => <option key={o} value={o}>{renderOption ? renderOption(o) : o}</option>)}
    </select>
  )
}

export default function CastTab({ gameId, initialCharId }) {
  const [characters, setCharacters] = useState([])
  const [media, setMedia] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const panelRowRef = useRef(null)
  const mediaFetchedRef = useRef(false)
  const [search, setSearch] = useState('')
  const [filterRarity, setFilterRarity] = useState('all')
  const [filterElement, setFilterElement] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterFaction, setFilterFaction] = useState('all')
  const [filterSeason, setFilterSeason] = useState('all')
  // ── All hooks must live above any early returns ──
  const [favCharIds, setFavCharIds] = useState(() => new Set(getFavChars().map((c) => c.id)))
  const refreshFavChars = () => setFavCharIds(new Set(getFavChars().map((c) => c.id)))

  const [favLimitHit, setFavLimitHit] = useState(false)

  const showLimit = () => {
    setFavLimitHit(true)
    setTimeout(() => setFavLimitHit(false), 2000)
  }

  const handleCardFav = (e, char) => {
    e.stopPropagation()
    const result = toggleFavChar({ ...char, game_slug: gameId })
    if (result === null) { showLimit(); return }
    refreshFavChars()
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    setActiveId(null)
    setMedia([])
    mediaFetchedRef.current = false
    fetch(`/api/games/${gameId}/characters`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load characters'); return r.json() })
      .then((chars) => {
        setCharacters(chars)
        setLoading(false)
        if (initialCharId) setActiveId(initialCharId)
      })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  // Lazy-load media only when a character panel is first opened
  useEffect(() => {
    if (!activeId || mediaFetchedRef.current) return
    mediaFetchedRef.current = true
    fetch(`/api/games/${gameId}/media`)
      .then((r) => r.ok ? r.json() : [])
      .then(setMedia)
      .catch(() => {})
  }, [activeId, gameId])

  useEffect(() => {
    if (activeId && panelRowRef.current) {
      const top = panelRowRef.current.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [activeId])

  if (loading) return <p className="tab-status">Loading cast...</p>
  if (error)   return <p className="tab-status tab-status--error">{error}</p>
  if (!characters.length) return <p className="tab-status">No characters found.</p>

  const rarityOptions   = [...new Set(characters.map((c) => c.rarity).filter(Boolean))].sort()
  const elementOptions  = [...new Set(characters.map((c) => c.element_type).filter(Boolean))].sort()
  const typeOptions     = [...new Set(characters.map((c) => c.combat_type).filter(Boolean))].sort()
  const factionOptions  = [...new Set(
    characters.map((c) => c.faction).filter((f) => f && f !== 'Main Character')
  )].sort()

  const q = search.trim().toLowerCase()
  const filtersActive = q || filterRarity !== 'all' || filterElement !== 'all' || filterType !== 'all' || filterFaction !== 'all' || filterSeason !== 'all'

  const applyFilters = (list) => list.filter((c) => {
    const displayName = (c.display_name || c.name).toLowerCase()
    const fullName    = c.name.toLowerCase()
    if (q && !displayName.includes(q) && !fullName.includes(q)) return false
    if (filterRarity  !== 'all' && c.rarity       !== filterRarity)        return false
    if (filterElement !== 'all' && c.element_type  !== filterElement)       return false
    if (filterType    !== 'all' && c.combat_type   !== filterType)          return false
    if (filterFaction !== 'all' && c.faction       !== filterFaction)       return false
    if (filterSeason  !== 'all' && String(c.season) !== filterSeason)       return false
    return true
  })

  const mainChars = filterSeason !== 'all'
    ? []
    : applyFilters(characters.filter((c) => c.faction === 'Main Character'))
  const season1   = applyFilters(characters.filter((c) => c.season === 1))
    .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name))
  const season2   = applyFilters(characters.filter((c) => c.season === 2))
    .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name))

  const groups = [
    ...(mainChars.length ? [{ label: 'Main Characters', chars: mainChars }] : []),
    ...(season1.length   ? [{ label: 'Season 1',        chars: season1   }] : []),
    ...(season2.length   ? [{ label: 'Season 2',        chars: season2   }] : []),
  ]

  const activeChar = activeId ? characters.find((c) => c.id === activeId) : null

  const clearFilters = () => {
    setSearch('')
    setFilterSeason('all')
    setFilterRarity('all')
    setFilterElement('all')
    setFilterType('all')
    setFilterFaction('all')
  }

  return (
    <div className="cast-tab">
      <div className="cast-toolbar">
        <div className="cast-search-wrap">
          <span className="cast-search-icon">⌕</span>
          <input
            className="cast-search"
            type="search"
            placeholder="Search characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="cast-filters">
          <CastFilter label="All Seasons"  value={filterSeason}  onChange={setFilterSeason}  options={['1', '2']} renderOption={(o) => `Season ${o}`} />
          <CastFilter label="All Rarities" value={filterRarity}  onChange={setFilterRarity}  options={rarityOptions} />
          <CastFilter label="All Elements" value={filterElement} onChange={setFilterElement} options={elementOptions} />
          <CastFilter label="All Types"    value={filterType}    onChange={setFilterType}    options={typeOptions} />
          <CastFilter label="All Factions" value={filterFaction} onChange={setFilterFaction} options={factionOptions} />
          {filtersActive && (
            <button className="cast-clear-btn" onClick={clearFilters}>Clear</button>
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <p className="tab-status">No characters match your search.</p>
      )}

      {groups.map(({ label, chars }) => {
        const activeInSection = activeChar && chars.find((c) => c.id === activeChar.id)
        return (
          <section key={label} className="cast-section">
            <div className="cast-grid">
              <h3 className="cast-section__title">{label}</h3>
              {activeInSection && (
                <div className="cast-panel-row" ref={panelRowRef}>
                  <CharacterPanel
                    key={activeChar.id}
                    char={activeChar}
                    onClose={() => setActiveId(null)}
                    relatedVideos={getRelatedVideos(activeChar, media)}
                    gameSlug={gameId}
                    onFavLimit={showLimit}
                  />
                </div>
              )}
              {chars.map((char) => (
                <div key={char.id} className="cast-card-wrap">
                  <button
                    className={`cast-card${activeId === char.id ? ' cast-card--active' : ''}`}
                    onClick={() => setActiveId(activeId === char.id ? null : char.id)}
                  >
                    <div className="cast-card__portrait">
                      {char.icon_url
                        ? <img src={char.icon_url} alt={char.name} />
                        : <div className="cast-card__fallback">{(char.display_name || char.name)[0]}</div>
                      }
                      <span
                        className="cast-card__rarity"
                        style={{ color: RARITY_COLOR[char.rarity] || '#888' }}
                      >
                        {char.rarity}
                      </span>
                    </div>
                    <p className="cast-card__name">{char.display_name || char.name}</p>
                  </button>
                  <button
                    className={`cast-card__fav${favCharIds.has(char.id) ? ' cast-card__fav--on' : ''}`}
                    onClick={(e) => handleCardFav(e, char)}
                    title={favCharIds.has(char.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favCharIds.has(char.id) ? '♥' : '♡'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
