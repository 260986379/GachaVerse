import { useState, useRef, useEffect } from 'react'
import nikkeData from '../../data/nikkeCharacters.json'
import nikkeCostumes from '../../data/nikkeCostumes.json'
import { isFavChar, toggleFavChar, getFavChars } from '../../utils/bookmarks'
import YouTubeEmbed from '../ui/YouTubeEmbed'

const RARITY_COLOR = { SSR: '#f0b429', SR: '#a78bfa', R: '#9ca3af' }
const ELEMENT_COLOR = {
  Electric: '#7fc8ff',
  Fire:     '#ff8c42',
  Wind:     '#6ee7b7',
  Iron:     '#9ca3af',
  Water:    '#60a5fa',
}
const BURST_LABEL = { '1': 'Burst I', '2': 'Burst II', '3': 'Burst III', All: 'All Bursts' }
const BURST_COLOR = { '1': '#f472b6', '2': '#fb923c', '3': '#a78bfa', All: '#f0b429' }

const stripNikkePrefix = (title) =>
  title?.replace(/^GODDESS OF VICTORY:\s*NIKKE\s*\|\s*/i, '').trim() ?? title

function getRelatedVideos(char, media) {
  if (!char || !media.length) return []
  const terms = new Set()
  terms.add(char.name.toLowerCase())
  // For costume variants ("Rapi: Red Hood"), also try the base name ("rapi")
  if (char.name.includes(':')) {
    const base = char.name.split(':')[0].trim().toLowerCase()
    if (base.length > 2) terms.add(base)
  }

  return media.filter((v) => {
    if (v.tags?.length) {
      const tagMatch = v.tags.some((tag) =>
        [...terms].some((term) => tag.toLowerCase().includes(term))
      )
      if (tagMatch) return true
    }
    const t = (v.title || '').toLowerCase()
    return [...terms].some((term) => t.includes(term))
  })
}

function StatRow({ label, value, color }) {
  return (
    <div className="char-panel__stat">
      <span className="char-panel__stat-label">{label}</span>
      <span className="char-panel__stat-value" style={color ? { color } : undefined}>
        {value || '—'}
      </span>
    </div>
  )
}

function CharacterPanel({ char, onClose, onFavLimit, relatedVideos }) {
  const [faved, setFaved]               = useState(() => isFavChar(char.id))
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [activeCostume, setActiveCostume] = useState(null) // null = default view
  const webmRef = useRef(null)

  const costumes = nikkeCostumes[char.id] ?? []

  // Restart looping webm whenever the source changes
  useEffect(() => {
    const vid = webmRef.current
    if (!vid) return
    vid.load()
    vid.play().catch(() => {})
    const restart = () => { vid.currentTime = 0; vid.play() }
    vid.addEventListener('ended', restart)
    return () => vid.removeEventListener('ended', restart)
  }, [activeCostume])

  // Reset costume when a different character panel opens
  useEffect(() => { setActiveCostume(null) }, [char.id])

  const handleFav = () => {
    const result = toggleFavChar({ ...char, game_slug: 'nikke' })
    if (result === null) { onFavLimit?.(); return }
    setFaved(result)
  }

  // What to show in the image panel
  const costumeWebm  = activeCostume?.url ?? null
  const baseWebm     = char.webm_url ?? null
  const activeWebm   = costumeWebm ?? baseWebm
  const showFullbody = !activeWebm && char.fullbody_url
  const showInitial  = !activeWebm && !char.fullbody_url

  return (
    <div className="char-panel">
      <div className="char-panel__top">
        <div className={`char-panel__image-side${showInitial ? ' nikke-char-panel__placeholder' : ''}`}>
          {activeWebm ? (
            <video
              key={activeWebm}
              ref={webmRef}
              className="nikke-char-panel__webm"
              src={activeWebm}
              autoPlay
              muted
              playsInline
              preload="auto"
            />
          ) : showFullbody ? (
            <img
              src={char.fullbody_url}
              alt={char.name}
              className="nikke-char-panel__fullbody"
            />
          ) : (
            <span className="nikke-char-panel__initial">{char.name[0]}</span>
          )}

          {/* Costume switcher — only shown when costumes exist */}
          {costumes.length > 0 && (
            <div className="nikke-char-panel__costumes">
              <button
                className={`nikke-char-panel__costume-chip${activeCostume === null ? ' nikke-char-panel__costume-chip--active' : ''}`}
                onClick={() => setActiveCostume(null)}
              >
                Default
              </button>
              {costumes.map((c) => (
                <button
                  key={c.name}
                  className={`nikke-char-panel__costume-chip${activeCostume?.name === c.name ? ' nikke-char-panel__costume-chip--active' : ''}`}
                  onClick={() => setActiveCostume(activeCostume?.name === c.name ? null : c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="char-panel__img-fade" />
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
          </div>

          <div className="char-panel__stats">
            <StatRow label="Rarity"       value={char.rarity}                                 color={RARITY_COLOR[char.rarity]} />
            <StatRow label="Class"        value={char.combat_type} />
            <StatRow label="Weapon"       value={char.weapon_type} />
            <StatRow label="Element"      value={char.element_type}                           color={ELEMENT_COLOR[char.element_type]} />
            <StatRow label="Manufacturer" value={char.manufacturer} />
            <StatRow label="Burst"        value={BURST_LABEL[char.burst] ?? char.burst}       color={BURST_COLOR[char.burst]} />
          </div>
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
                  <p className="char-panel__video-name">{stripNikkePrefix(v.title)}</p>
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
      {options.map((o) => (
        <option key={o} value={o}>{renderOption ? renderOption(o) : o}</option>
      ))}
    </select>
  )
}

export default function NikkeCharactersTab({ initialCharId = null }) {
  const [activeId, setActiveId]                     = useState(null)
  const [media, setMedia]                           = useState([])
  const [search, setSearch]                         = useState('')
  const [filterRarity, setFilterRarity]             = useState('all')
  const [filterClass, setFilterClass]               = useState('all')
  const [filterWeapon, setFilterWeapon]             = useState('all')
  const [filterElement, setFilterElement]           = useState('all')
  const [filterManufacturer, setFilterManufacturer] = useState('all')
  const [filterBurst, setFilterBurst]               = useState('all')
  const [filterCostume, setFilterCostume]           = useState('all')
  const [favCharIds, setFavCharIds]                 = useState(() => new Set(getFavChars().map((c) => c.id)))
  const [favLimitHit, setFavLimitHit]               = useState(false)
  const panelRef        = useRef(null)
  const mediaFetchedRef = useRef(false)
  // name.toLowerCase() → DB UUID — populated on mount for proper DB sync
  const dbIdMap = useRef({})

  // Fetch DB character UUIDs once on mount so favorites sync correctly to the DB
  useEffect(() => {
    fetch('/api/games/nikke/characters')
      .then(r => r.ok ? r.json() : [])
      .then(chars => {
        const map = {}
        chars.forEach(c => { map[c.name.toLowerCase()] = c.id })
        dbIdMap.current = map
      })
      .catch(() => {})
  }, [])

  // Enrich a local JSON char with its DB UUID so the DB sync uses the right PK
  const enrichChar = (char) => ({
    ...char,
    dbId: dbIdMap.current[char.name.toLowerCase()] ?? undefined,
  })

  const refreshFavs = () => setFavCharIds(new Set(getFavChars().map((c) => c.id)))

  const showLimit = () => {
    setFavLimitHit(true)
    setTimeout(() => setFavLimitHit(false), 2000)
  }

  const handleCardFav = (e, char) => {
    e.stopPropagation()
    const result = toggleFavChar({ ...enrichChar(char), game_slug: 'nikke' })
    if (result === null) { showLimit(); return }
    refreshFavs()
  }

  // Apply initialCharId after mount effects so GamePage's scrollTo(0,0) fires first
  // (parent effects run after child effects; setTimeout defers to the next macrotask)
  useEffect(() => {
    if (!initialCharId) return
    const t = setTimeout(() => setActiveId(initialCharId), 0)
    return () => clearTimeout(t)
  }, [initialCharId])

  // Lazy-load media the first time a character panel is opened
  useEffect(() => {
    if (!activeId || mediaFetchedRef.current) return
    mediaFetchedRef.current = true
    fetch('/api/games/nikke/media')
      .then((r) => (r.ok ? r.json() : []))
      .then(setMedia)
      .catch(() => {})
  }, [activeId])

  useEffect(() => {
    if (activeId && panelRef.current) {
      const top = panelRef.current.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [activeId])

  const q = search.trim().toLowerCase()
  const filtersActive =
    q ||
    filterRarity !== 'all' ||
    filterClass !== 'all' ||
    filterWeapon !== 'all' ||
    filterElement !== 'all' ||
    filterManufacturer !== 'all' ||
    filterBurst !== 'all' ||
    filterCostume !== 'all'

  const filtered = nikkeData.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false
    if (filterRarity       !== 'all' && c.rarity       !== filterRarity)       return false
    if (filterClass        !== 'all' && c.combat_type  !== filterClass)        return false
    if (filterWeapon       !== 'all' && c.weapon_type  !== filterWeapon)       return false
    if (filterElement      !== 'all' && c.element_type !== filterElement)      return false
    if (filterManufacturer !== 'all' && c.manufacturer !== filterManufacturer) return false
    if (filterBurst        !== 'all' && c.burst        !== filterBurst)        return false
    if (filterCostume      !== 'all' && !nikkeCostumes[c.id])                  return false
    return true
  })

  const byRarity = (r) =>
    filtered.filter((c) => c.rarity === r).sort((a, b) => a.name.localeCompare(b.name))

  const groups = [
    { label: 'SSR', chars: byRarity('SSR') },
    { label: 'SR',  chars: byRarity('SR')  },
    { label: 'R',   chars: byRarity('R')   },
  ].filter((g) => g.chars.length > 0)

  const activeChar = activeId
    ? enrichChar(nikkeData.find((c) => c.id === activeId))
    : null

  const clearFilters = () => {
    setSearch('')
    setFilterRarity('all')
    setFilterClass('all')
    setFilterWeapon('all')
    setFilterElement('all')
    setFilterManufacturer('all')
    setFilterBurst('all')
    setFilterCostume('all')
  }

  return (
    <div className="cast-tab">
      {favLimitHit && <div className="fav-limit-toast">Favorite limit reached (10 max)</div>}

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
          <CastFilter label="All Rarities"      value={filterRarity}        onChange={setFilterRarity}        options={['SSR', 'SR', 'R']} />
          <CastFilter label="All Classes"       value={filterClass}         onChange={setFilterClass}         options={['Attacker', 'Defender', 'Supporter']} />
          <CastFilter label="All Weapons"       value={filterWeapon}        onChange={setFilterWeapon}        options={['Assault Rifle', 'Machine Gun', 'Rocket Launcher', 'Shotgun', 'Sniper Rifle', 'Submachine Gun']} />
          <CastFilter label="All Elements"      value={filterElement}       onChange={setFilterElement}       options={['Electric', 'Fire', 'Iron', 'Water', 'Wind']} />
          <CastFilter label="All Manufacturers" value={filterManufacturer}  onChange={setFilterManufacturer}  options={['Abnormal', 'Elysion', 'Missilis', 'Pilgrim', 'Tetra']} />
          <CastFilter
            label="All Bursts"
            value={filterBurst}
            onChange={setFilterBurst}
            options={['1', '2', '3', 'All']}
            renderOption={(o) => BURST_LABEL[o] ?? o}
          />
          <select
            className="cast-filter"
            value={filterCostume}
            onChange={(e) => setFilterCostume(e.target.value)}
          >
            <option value="all">All Skins</option>
            <option value="has-costume">Has Skin</option>
          </select>
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
                <div className="cast-panel-row" ref={panelRef}>
                  <CharacterPanel
                    key={activeChar.id}
                    char={activeChar}
                    onClose={() => setActiveId(null)}
                    onFavLimit={showLimit}
                    relatedVideos={getRelatedVideos(activeChar, media)}
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
                        ? <img src={char.icon_url} alt={char.name} loading="lazy" />
                        : <div className="cast-card__fallback">{char.name[0]}</div>
                      }
                      <span
                        className="cast-card__rarity"
                        style={{ color: RARITY_COLOR[char.rarity] ?? '#888' }}
                      >
                        {char.rarity}
                      </span>
                      {nikkeCostumes[char.id] && (
                        <span className="cast-card__costume-tag">SKIN</span>
                      )}
                    </div>
                    <p className="cast-card__name">{char.name}</p>
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
