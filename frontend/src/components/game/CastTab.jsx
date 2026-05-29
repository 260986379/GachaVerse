import { useState, useEffect, useRef } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'
import { isFavChar, toggleFavChar, getFavChars } from '../../utils/bookmarks'

const RARITY_COLOR  = { SSR: '#f0b429', SR: '#a78bfa' }
const RARITY_LABEL  = { SSR: '5★  S-Rank', SR: '4★  A-Rank' }
const ELEMENT_COLOR = {
  // ZZZ / NIKKE
  Physical:  '#d4c9b8',
  Electric:  '#7fc8ff',
  Fire:      '#ff8c42',
  Ice:       '#7ecfed',
  Ether:     '#c4a0f0',
  // Genshin Impact
  Pyro:    '#ff6b35',
  Hydro:   '#3ab0e8',
  Cryo:    '#8fd6f0',
  Electro: '#c07fff',
  Anemo:   '#4ecfb0',
  Geo:     '#e8b84b',
  Dendro:  '#7ecf45',
  // Honkai: Star Rail
  Lightning: '#c084fc',
  Wind:      '#4ecfb0',
  Quantum:   '#6b5aed',
  Imaginary: '#e8c44a',
}
const TYPE_COLOR = {
  // ZZZ / NIKKE roles
  Attack:  '#e05555',
  Stun:    '#e8b84b',
  Anomaly: '#c070e0',
  Support: '#5bad6f',
  Defense: '#5b8fe0',
  Rupture: '#d46030',
  // Genshin weapon types
  Sword:    '#a8c4d8',
  Claymore: '#c49090',
  Bow:      '#90c890',
  Catalyst: '#c0a0d8',
  Polearm:  '#d8b870',
  // HSR paths
  Destruction:  '#e05555',
  'The Hunt':   '#f59e0b',
  Erudition:    '#3b82f6',
  Harmony:      '#10b981',
  Nihility:     '#8b5cf6',
  Preservation: '#64748b',
  Abundance:    '#22c55e',
  Remembrance:  '#60a5fa',
  Elation:      '#f97316',
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
  const isSplashArt = char.splash_art_urls?.length > 0 || !!char.splash_art_url
  const images = (char.splash_art_urls?.length > 0 ? char.splash_art_urls : [char.splash_art_url || char.icon_url]).filter(Boolean)
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
            {gameSlug !== 'genshin-impact' && gameSlug !== 'honkai-star-rail' && <StatRow label="Season" value={char.season ? `Season ${char.season}` : '—'} />}
            <StatRow label="Element" value={char.element_type || '—'} color={ELEMENT_COLOR[char.element_type]} />
            <StatRow label={gameSlug === 'genshin-impact' ? 'Weapon' : gameSlug === 'honkai-star-rail' ? 'Path' : 'Type'} value={char.combat_type || '—'} color={TYPE_COLOR[char.combat_type]} />
            {char.version && <StatRow label="Version" value={`v${char.version}`} />}
            {char.faction && char.faction !== 'Main Character' && (
              <div className="char-panel__stat char-panel__stat--full">
                <span className="char-panel__stat-label">{gameSlug === 'genshin-impact' ? 'Region' : 'Faction'}</span>
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
  const [filterVersion, setFilterVersion] = useState('all')
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
  // Handles both numeric ("1.0") and named ("Luna I") versions
  const ROMAN_VAL = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 }
  const versionSortVal = (v) => {
    if (!v) return 0
    if (/^\d/.test(v)) return parseFloat(v)
    const suffix = v.trim().split(' ').pop()
    return 1000 + (ROMAN_VAL[suffix] || 0)
  }
  const getMajorVersion = (v) => {
    if (!v) return null
    if (/^\d/.test(v)) return String(Math.floor(parseFloat(v)))
    return v.trim().split(' ')[0]   // "Luna I" → "Luna"
  }

  const versionOptions  = [...new Set(characters.map((c) => c.version).filter(Boolean))]
    .sort((a, b) => versionSortVal(a) - versionSortVal(b))
  const majorVersionOptions = [...new Set(versionOptions.map(getMajorVersion).filter(Boolean))]
    .sort((a, b) => {
      const aNum = /^\d/.test(a), bNum = /^\d/.test(b)
      if (aNum && bNum) return parseFloat(a) - parseFloat(b)
      if (aNum) return -1
      if (bNum) return 1
      return a.localeCompare(b)
    })

  const useVersions = versionOptions.length > 0

  const q = search.trim().toLowerCase()
  const filtersActive = q || filterRarity !== 'all' || filterElement !== 'all' || filterType !== 'all' || filterFaction !== 'all' || filterSeason !== 'all' || filterVersion !== 'all'

  const applyFilters = (list) => list.filter((c) => {
    const displayName = (c.display_name || c.name).toLowerCase()
    const fullName    = c.name.toLowerCase()
    if (q && !displayName.includes(q) && !fullName.includes(q)) return false
    if (filterRarity  !== 'all' && c.rarity       !== filterRarity)        return false
    if (filterElement !== 'all' && c.element_type  !== filterElement)       return false
    if (filterType    !== 'all' && c.combat_type   !== filterType)          return false
    if (filterFaction !== 'all' && c.faction       !== filterFaction)       return false
    if (filterSeason  !== 'all' && String(c.season) !== filterSeason)       return false
    if (filterVersion !== 'all' && getMajorVersion(c.version) !== filterVersion) return false
    return true
  })

  const mainChars = filterSeason !== 'all'
    ? []
    : applyFilters(characters.filter((c) => c.faction === 'Main Character'))
  const season1   = applyFilters(characters.filter((c) => c.season === 1))
    .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name))
  const season2   = applyFilters(characters.filter((c) => c.season === 2))
    .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name))
  const useSeasons = characters.some((c) => c.season != null)

  // Group by major version: numeric ("1") → "Version 1", named ("Luna") → "Luna"
  const versionGroups = !useSeasons
    ? majorVersionOptions
        .map((major) => ({
          label: /^\d/.test(major) ? `Version ${major}` : major,
          chars: applyFilters(
            characters.filter((c) => c.faction !== 'Main Character' && getMajorVersion(c.version) === major)
          ).sort((a, b) => {
            const vDiff = versionSortVal(a.version) - versionSortVal(b.version)
            if (vDiff !== 0) return vDiff
            return (a.display_name || a.name).localeCompare(b.display_name || b.name)
          }),
        }))
        .filter((g) => g.chars.length > 0)
    : []

  // Characters with no version and no season
  const noGroup = !useSeasons
    ? applyFilters(characters.filter((c) => c.faction !== 'Main Character' && c.season == null && !c.version))
        .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name))
    : []

  const groups = [
    ...(mainChars.length ? [{ label: 'Main Characters', chars: mainChars }] : []),
    ...(season1.length   ? [{ label: 'Season 1',        chars: season1   }] : []),
    ...(season2.length   ? [{ label: 'Season 2',        chars: season2   }] : []),
    ...versionGroups,
    ...(noGroup.length   ? [{ label: 'Characters',      chars: noGroup   }] : []),
  ]

  const activeChar = activeId ? characters.find((c) => c.id === activeId) : null

  const clearFilters = () => {
    setSearch('')
    setFilterSeason('all')
    setFilterRarity('all')
    setFilterElement('all')
    setFilterType('all')
    setFilterFaction('all')
    setFilterVersion('all')
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
          {useSeasons && <CastFilter label="All Seasons" value={filterSeason} onChange={setFilterSeason} options={['1', '2']} renderOption={(o) => `Season ${o}`} />}
          <CastFilter label="All Rarities" value={filterRarity}  onChange={setFilterRarity}  options={rarityOptions} />
          <CastFilter label="All Elements" value={filterElement} onChange={setFilterElement} options={elementOptions} />
          <CastFilter label="All Types"    value={filterType}    onChange={setFilterType}    options={typeOptions} />
          {factionOptions.length > 0 && <CastFilter label="All Factions" value={filterFaction} onChange={setFilterFaction} options={factionOptions} />}
          {useVersions && <CastFilter label="All Versions" value={filterVersion} onChange={setFilterVersion} options={majorVersionOptions} renderOption={(o) => /^\d/.test(o) ? `Version ${o}` : o} />}
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
