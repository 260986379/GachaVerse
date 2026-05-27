import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getFavVideos, getFavChars, getFavArtworks, toggleFavArtwork, getFollowedGames,
  getGameUID, setGameUID, removeGameUID,
  getProfileBanner, setProfileBanner, clearProfileBanner,
  getProfilePfp, setProfilePfp, clearProfilePfp,
  getBoards, addBoard, removeBoard, seedBoards,
} from '../utils/bookmarks'
import YouTubeEmbed from '../components/ui/YouTubeEmbed'
import BoardLightbox from '../components/ui/BoardLightbox'
import ImageLightbox from '../components/ui/ImageLightbox'
import GameCard from '../components/GameCard'
import './AccountPage.css'

const SHOWCASE_GAMES = [
  { id: 'zenless-zone-zero', name: 'Zenless Zone Zero', color1: '#f59e42', color2: '#b04a00' },
  { id: 'nikke',             name: 'NIKKE',             color1: '#4a90e2', color2: '#1a3a6a' },
]

const GAME_ACCOUNT_META = {
  'zenless-zone-zero': {
    statLabels: ['Inter-Knot Lv', 'Agent Rank', 'Server', 'UID'],
    rosterLabel: 'Agents',
    pullLabel: 'Signal Searches',
  },
  'nikke': {
    statLabels: ['Commander Lv', 'Synchro Lv', 'Server', 'UID'],
    rosterLabel: 'Nikkes',
    pullLabel: 'Recruit History',
  },
}

const DEFAULT_GAME_META = {
  statLabels: ['Level', 'Rank', 'Server', 'UID'],
  rosterLabel: 'Characters',
  pullLabel: 'Gacha History',
}

function SocialStat({ label, value }) {
  return (
    <div className="ps-social-stat">
      <span className="ps-social-stat__value">{value}</span>
      <span className="ps-social-stat__label">{label}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="ps-info-row">
      <span className="ps-info-row__label">{label}</span>
      <span className="ps-info-row__value">{value}</span>
    </div>
  )
}

function GameAccountCard({ game, onClick }) {
  return (
    <button
      className="ps-game-card ps-game-card--interactive"
      style={{ '--g1': game.color1, '--g2': game.color2 }}
      onClick={onClick}
    >
      <div className="ps-game-card__cover" />
      <div className="ps-game-card__body">
        <p className="ps-game-card__name">{game.name}</p>
        <div className="ps-game-card__stats">
          <span className="ps-game-card__stat"><span>UID</span><span>—</span></span>
          <span className="ps-game-card__stat"><span>Level</span><span>—</span></span>
          <span className="ps-game-card__stat"><span>Rank</span><span>—</span></span>
        </div>
        <span className="ps-game-card__cta">View Account →</span>
      </div>
    </button>
  )
}

function ShowcaseAgentCard({ agent, onClick }) {
  return (
    <button
      className="ps-char-card ga-showcase-card"
      style={{ '--accent': agent.elementColor }}
      onClick={onClick}
    >
      <div className="ps-char-card__portrait ga-showcase-card__portrait">
        {agent.portraitUrl
          ? <img src={agent.portraitUrl} alt={agent.displayName} loading="lazy" />
          : <div className="ps-char-card__fallback">{agent.displayName[0]}</div>
        }
        <span className="ga-showcase-card__rarity">{agent.rarity}</span>
        <span className="ga-showcase-card__lv">Lv.{agent.level}</span>
        {agent.mindscapeLevel > 0 && (
          <span className="ga-showcase-card__mindscape">M{agent.mindscapeLevel}</span>
        )}
      </div>
      <p className="ps-char-card__name">{agent.displayName}</p>
      <p className="ga-showcase-card__element" style={{ color: agent.elementColor }}>
        {agent.element}
      </p>
    </button>
  )
}

function AgentDetailModal({ agent, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="agent-modal-overlay" onClick={onClose}>
      <div className="agent-modal" onClick={e => e.stopPropagation()}>
        <button className="agent-modal__close" onClick={onClose}>✕</button>

        {/* Portrait + identity */}
        <div className="agent-modal__header" style={{ '--accent': agent.elementColor }}>
          <div className="agent-modal__portrait">
            {(agent.portraitUrl || agent.iconUrl)
              ? <img src={agent.portraitUrl || agent.iconUrl} alt={agent.displayName} />
              : <div className="agent-modal__portrait-fallback">{agent.displayName[0]}</div>
            }
          </div>
          <div className="agent-modal__identity">
            <span className="agent-modal__rarity-badge">{agent.rarity}-Rank</span>
            <h2 className="agent-modal__name">{agent.displayName}</h2>
            <div className="agent-modal__tags">
              <span className="agent-modal__element" style={{ color: agent.elementColor }}>
                {agent.element}
              </span>
              <span className="agent-modal__tag-sep">·</span>
              <span className="agent-modal__profession">{agent.profession}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="agent-modal__stats">
          {[
            ['Level',      `Lv.${agent.level}`],
            ['Ascension',  `${agent.promotionLevel}/6`],
            ['Mindscape',  `M${agent.mindscapeLevel}`],
            ['Core Skill', `${agent.coreSkillLevel}/6`],
          ].map(([label, value]) => (
            <div key={label} className="agent-modal__stat">
              <span className="agent-modal__stat-value">{value}</span>
              <span className="agent-modal__stat-label">{label}</span>
            </div>
          ))}
        </div>

        {/* W-Engine */}
        {agent.weapon && (
          <div className="agent-modal__section">
            <h3 className="agent-modal__section-title">W-Engine</h3>
            <div className="agent-modal__weapon">
              {agent.weapon.iconUrl && (
                <img
                  className="agent-modal__weapon-icon"
                  src={agent.weapon.iconUrl}
                  alt={agent.weapon.name}
                />
              )}
              <div className="agent-modal__weapon-info">
                <p className="agent-modal__weapon-name">{agent.weapon.name}</p>
                <p className="agent-modal__weapon-meta">
                  Lv.{agent.weapon.level}
                  <span className="agent-modal__weapon-sep" />
                  Refinement {agent.weapon.refinement}
                  <span className="agent-modal__weapon-sep" />
                  {agent.weapon.rarity}-Rank
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function GameAccountView({ game, onBack }) {
  const meta = GAME_ACCOUNT_META[game.id] ?? DEFAULT_GAME_META
  const isZZZ = game.id === 'zenless-zone-zero'

  const [uid, setUid] = useState('')
  const [playerData, setPlayerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [changing, setChanging] = useState(false)
  const [activeAgent, setActiveAgent] = useState(null)

  // Auto-load if a UID was previously saved
  useEffect(() => {
    if (!isZZZ) return
    const saved = getGameUID(game.id)
    if (saved) {
      fetchPlayer(saved)
    }
  }, [game.id])

  const fetchPlayer = async (targetUid) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${game.id}/player/${targetUid}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load profile')
      setGameUID(game.id, targetUid)
      setPlayerData(data)
      setChanging(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLink = (e) => {
    e.preventDefault()
    const trimmed = uid.trim()
    if (!trimmed) return
    fetchPlayer(trimmed)
  }

  const handleUnlink = () => {
    removeGameUID(game.id)
    setPlayerData(null)
    setUid('')
    setError(null)
    setChanging(false)
  }

  const headerStatus = playerData
    ? `${playerData.region} · Inter-Knot Lv.${playerData.level}`
    : 'Account not linked'

  const showLinkForm = isZZZ && (!playerData || changing)

  return (
    <div className="ga-view">
      <div className="ga-header" style={{ '--g1': game.color1, '--g2': game.color2 }}>
        <button className="ga-header__back" onClick={onBack}>← Profile</button>
        <div className="ga-header__info">
          <h2 className="ga-header__game-name">
            {playerData && !changing ? playerData.nickname : game.name}
          </h2>
          <span className="ga-header__status">{playerData && !changing ? headerStatus : 'Account not linked'}</span>
        </div>
        {playerData?.bio && !changing && (
          <p className="ga-header__bio">{playerData.bio}</p>
        )}
      </div>

      {loading && (
        <p className="ga-loading">Loading profile…</p>
      )}

      {showLinkForm && !loading && (
        <form className="ga-uid-form" onSubmit={handleLink}>
          <div className="ga-uid-form__label">
            Link your {game.name} account by entering your UID.
          </div>
          <div className="ga-uid-form__row">
            <input
              className="ga-uid-input"
              type="text"
              placeholder="Your UID (e.g. 1000473389)"
              value={uid}
              onChange={e => setUid(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              autoFocus
            />
            <button className="ga-uid-submit" type="submit">Link</button>
            {changing && (
              <button className="ga-uid-cancel" type="button" onClick={() => setChanging(false)}>
                Cancel
              </button>
            )}
          </div>
          {error && <p className="ga-uid-error">{error}</p>}
        </form>
      )}

      {playerData && !changing && !loading && (
        <>
          <div className="ga-stats-row">
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.uid}</span>
              <span className="ga-stat__label">UID</span>
            </div>
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.region}</span>
              <span className="ga-stat__label">Server</span>
            </div>
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.level}</span>
              <span className="ga-stat__label">Inter-Knot Lv</span>
            </div>
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.agents.length}/6</span>
              <span className="ga-stat__label">Showcase</span>
            </div>
          </div>

          <div className="ga-sections">
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Agent Showcase</h2>
                <div className="ga-account-actions">
                  <button className="ga-reload-btn" onClick={() => { setUid(''); setChanging(true) }}>
                    Change UID
                  </button>
                  <button className="ga-reload-btn ga-reload-btn--unlink" onClick={handleUnlink}>
                    Unlink
                  </button>
                </div>
              </div>
              <div className="ga-agents-grid">
                {playerData.agents.map(a => (
                  <ShowcaseAgentCard key={a.id} agent={a} onClick={() => setActiveAgent(a)} />
                ))}
              </div>
            </section>

          </div>
        </>
      )}

      {!playerData && !showLinkForm && !loading && (
        <div className="ga-sections">
          <div className="ga-two-col">
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">{meta.pullLabel}</h2>
              </div>
              <p className="profile-empty">Link your account to see pull history.</p>
            </section>
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Achievements</h2>
              </div>
              <p className="profile-empty">Link your account to see achievements.</p>
            </section>
          </div>
        </div>
      )}

      {activeAgent && (
        <AgentDetailModal agent={activeAgent} onClose={() => setActiveAgent(null)} />
      )}
    </div>
  )
}

function VideoCard({ video, isActive, onClick }) {
  return (
    <button
      className={`ps-video-card${isActive ? ' ps-video-card--active' : ''}`}
      onClick={onClick}
    >
      <div className="ps-video-card__thumb">
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
          : <div className="ps-video-card__thumb-fallback" />
        }
        <div className="ps-video-card__play">▶</div>
      </div>
      <p className="ps-video-card__title">{video.title}</p>
    </button>
  )
}

function ArtworkCard({ art, onUnfav, onOpen }) {
  return (
    <div className="ps-artwork-card">
      <div className="ps-artwork-card__thumb" onClick={() => onOpen(art)}>
        {art.thumbnail_url
          ? <img src={art.thumbnail_url} alt={art.title} loading="lazy" />
          : <div className="ps-artwork-card__fallback" />
        }
      </div>
      <div className="ps-artwork-card__footer">
        <p className="ps-artwork-card__title">{art.title}</p>
        <button
          className="ps-artwork-card__unfav"
          onClick={() => onUnfav(art.id)}
          title="Remove from favorites"
        >♥</button>
      </div>
    </div>
  )
}

function CharCard({ char, onClick }) {
  return (
    <button className="ps-char-card" onClick={onClick}>
      <div className="ps-char-card__portrait">
        {char.icon_url
          ? <img src={char.icon_url} alt={char.display_name || char.name} loading="lazy" />
          : <div className="ps-char-card__fallback">{(char.display_name || char.name)[0]}</div>
        }
      </div>
      <p className="ps-char-card__name">{char.display_name || char.name}</p>
    </button>
  )
}

const SEED_BOARDS = [
  { gameId: 'zenless-zone-zero', gameName: 'Zenless Zone Zero', imageUrl: '/boards/board-1.jpg', caption: '' },
  { gameId: 'zenless-zone-zero', gameName: 'Zenless Zone Zero', imageUrl: '/boards/board-2.png', caption: '' },
  { gameId: 'zenless-zone-zero', gameName: 'Zenless Zone Zero', imageUrl: '/boards/board-4.jpg', caption: '' },
  { gameId: 'zenless-zone-zero', gameName: 'Zenless Zone Zero', imageUrl: '/boards/board-5.jpg', caption: '' },
  { gameId: 'nikke',             gameName: 'NIKKE',             imageUrl: '/boards/board-3.jpg', caption: '' },
  { gameId: 'nikke',             gameName: 'NIKKE',             imageUrl: '/boards/board-6.jpg', caption: '' },
  { gameId: 'nikke',             gameName: 'NIKKE',             imageUrl: '/boards/board-7.jpg', caption: '' },
]

function BoardUploadModal({ onAdd, onClose }) {
  const [gameId, setGameId] = useState(SHOWCASE_GAMES[0].id)
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [caption, setCaption] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file, 900, 1400, 0.88)
    setImageDataUrl(dataUrl)
    e.target.value = ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!imageDataUrl) return
    const game = SHOWCASE_GAMES.find((g) => g.id === gameId)
    onAdd({ gameId, gameName: game.name, imageUrl: imageDataUrl, caption: caption.trim() })
    onClose()
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="board-modal-overlay" onClick={onClose}>
      <div className="board-modal" onClick={(e) => e.stopPropagation()}>
        <button className="board-modal__close" onClick={onClose}>✕</button>
        <h3 className="board-modal__title">Add to Board</h3>
        <form onSubmit={handleSubmit}>
          <label className="board-modal__field-label">Game</label>
          <select
            className="board-modal__game-select"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            {SHOWCASE_GAMES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <div
            className="board-modal__upload"
            onClick={() => fileRef.current?.click()}
          >
            {imageDataUrl
              ? <img src={imageDataUrl} alt="preview" />
              : <span className="board-modal__upload-hint">Click to upload image</span>
            }
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>

          <textarea
            className="board-modal__caption"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
          />

          <button className="board-modal__submit" type="submit" disabled={!imageDataUrl}>
            Add to Board
          </button>
        </form>
      </div>
    </div>
  )
}

// Compress an image file to a JPEG data URL via canvas.
// maxW / maxH cap dimensions so localStorage stays reasonable.
function compressImage(file, maxW, maxH, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW }
      if (height > maxH) { width = Math.round(width * maxH / height); height = maxH }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function AccountPage() {
  const navigate = useNavigate()
  const [favVideos,      setFavVideos]      = useState([])
  const [favChars,       setFavChars]       = useState([])
  const [favArtworks,    setFavArtworks]    = useState([])
  const [followedGames,  setFollowedGames]  = useState([])
  const [boards,         setBoards]         = useState([])
  const [showBoardModal, setShowBoardModal] = useState(false)
  const [activeBoard,    setActiveBoard]    = useState(null)
  const [activeArtwork,  setActiveArtwork]  = useState(null)
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [activeVideoTitle, setActiveVideoTitle] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)

  const [bannerSrc, setBannerSrc] = useState(null)
  const [pfpSrc,    setPfpSrc]    = useState(null)
  const bannerInputRef = useRef(null)
  const pfpInputRef    = useRef(null)

  useEffect(() => {
    seedBoards(SEED_BOARDS)
    setFavVideos(getFavVideos())
    setFavChars(getFavChars())
    setFavArtworks(getFavArtworks())
    setFollowedGames(getFollowedGames())
    setBoards(getBoards())
    setBannerSrc(getProfileBanner() || '/account/banner.png')
    setPfpSrc(getProfilePfp()       || '/account/portrait.jpg')
  }, [])

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file, 1500, 500, 0.88)
    setProfileBanner(dataUrl)
    setBannerSrc(dataUrl)
    e.target.value = ''
  }

  const handlePfpUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImage(file, 400, 533, 0.88)
    setProfilePfp(dataUrl)
    setPfpSrc(dataUrl)
    e.target.value = ''
  }

  const resetBanner = () => { clearProfileBanner(); setBannerSrc('/account/banner.png') }
  const resetPfp    = () => { clearProfilePfp();    setPfpSrc('/account/portrait.jpg') }

  const handleVideoClick = (video) => {
    if (activeVideoId === video.external_id) {
      setActiveVideoId(null)
      setActiveVideoTitle('')
    } else {
      setActiveVideoId(video.external_id)
      setActiveVideoTitle(video.title)
    }
  }

  const handleAddBoard = (boardData) => {
    const entry = addBoard(boardData)
    if (entry) setBoards(getBoards())
  }

  const handleDeleteBoard = (id) => {
    removeBoard(id)
    setBoards(getBoards())
  }

  const handleUnfavArtwork = (id) => {
    toggleFavArtwork({ id })
    setFavArtworks(getFavArtworks())
  }

  const handleCharClick = (char) => {
    const slug = char.game_slug
    if (!slug) return
    navigate(`/game/${slug}`, { state: { openTab: 'Characters', openCharId: char.id } })
  }

  return (
    <div className="profile-page">
      <div className="profile-inner">

        {/* Banner */}
        <div
          className="profile-banner"
          style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}
        >
          <div className="profile-banner__fade" />
          <div className="profile-banner__overlay">
            <button className="profile-banner__change" onClick={() => bannerInputRef.current?.click()}>
              Change Banner
            </button>
            {getProfileBanner() && (
              <button className="profile-banner__reset" onClick={resetBanner}>Reset</button>
            )}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBannerUpload}
          />
        </div>

        <div className="profile-layout">

          {/* ── Left sidebar ── */}
          <aside className="profile-sidebar">
            <h2 className="profile-sidebar__name">Guest User's Profile</h2>

            <div className="profile-sidebar__card">
              <div className="profile-pfp" onClick={() => pfpInputRef.current?.click()}>
                {pfpSrc
                  ? <img src={pfpSrc} alt="Profile" className="profile-pfp__img" />
                  : (
                    <div className="profile-pfp__hint">
                      <span>+</span>
                      <span>Add Photo</span>
                    </div>
                  )
                }
                <div className="profile-pfp__overlay">
                  <span>Change Photo</span>
                  {getProfilePfp() && (
                    <button
                      className="profile-pfp__reset"
                      onClick={e => { e.stopPropagation(); resetPfp() }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  ref={pfpInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePfpUpload}
                />
              </div>

              {/* Following / Followers */}
              <div className="profile-sidebar__social">
                <SocialStat label="Following" value="0" />
                <div className="profile-sidebar__social-divider" />
                <SocialStat label="Followers" value="0" />
              </div>

              <div className="profile-sidebar__info">
                <InfoRow label="Last Online" value="—" />
                <InfoRow label="Birthday"    value="—" />
                <InfoRow label="Joined"      value="—" />
              </div>
            </div>
          </aside>

          {/* ── Right main ── */}
          <main className="profile-main">

            {selectedGame ? (
              <GameAccountView
                game={selectedGame}
                onBack={() => setSelectedGame(null)}
              />
            ) : (
              <>
                {/* Board */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Board</h2>
                    <span className="profile-section__count">{boards.length}/10</span>
                  </div>
                  {boards.length > 0 ? (
                    <div className="profile-board-grid">
                      {boards.map((b) => (
                        <div
                          key={b.id}
                          className="profile-board-card"
                          onClick={() => setActiveBoard(b)}
                        >
                          <img src={b.imageUrl} alt={b.caption || b.gameName} loading="lazy" />
                          <div className="profile-board-card__overlay">
                            <span className="profile-board-card__game">{b.gameName}</span>
                            <button
                              className="profile-board-card__delete"
                              onClick={(e) => { e.stopPropagation(); handleDeleteBoard(b.id) }}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                      {boards.length < 10 && (
                        <button
                          className="profile-board-add"
                          onClick={() => setShowBoardModal(true)}
                        >+</button>
                      )}
                    </div>
                  ) : (
                    <div className="profile-board-empty">
                      <button
                        className="profile-board-add profile-board-add--hero"
                        onClick={() => setShowBoardModal(true)}
                      >
                        <span>+</span>
                        <span>Add your first board</span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Game Account Showcase */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Game Account Showcase</h2>
                  </div>
                  <div className="profile-hscroll">
                    {SHOWCASE_GAMES.map((g) => (
                      <GameAccountCard key={g.id} game={g} onClick={() => setSelectedGame(g)} />
                    ))}
                  </div>
                </section>

                {/* Followed Games */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Followed Games</h2>
                  </div>
                  {followedGames.length > 0 ? (
                    <div className="profile-hscroll">
                      {followedGames.map((g) => (
                        <GameCard key={g.id} game={g} />
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">No followed games yet — follow a game to add it here.</p>
                  )}
                </section>

                {/* Favorite Videos */}
                {(() => {
                  const favRegular = favVideos.filter(v => v.category !== 'Music')
                  const favBGM     = favVideos.filter(v => v.category === 'Music')
                  const activeInRegular = favRegular.some(v => v.external_id === activeVideoId)
                  const activeInBGM     = favBGM.some(v => v.external_id === activeVideoId)
                  return (
                    <>
                      <section className="profile-section">
                        <div className="profile-section__header">
                          <h2 className="profile-section__title">Favorite Videos</h2>
                        </div>
                        {favRegular.length > 0 ? (
                          <>
                            <div className="profile-hscroll">
                              {favRegular.map((v, i) => (
                                <VideoCard
                                  key={v.id ?? i}
                                  video={v}
                                  isActive={activeVideoId === v.external_id}
                                  onClick={() => handleVideoClick(v)}
                                />
                              ))}
                            </div>
                            {activeInRegular && (
                              <div className="profile-video-player">
                                <YouTubeEmbed videoId={activeVideoId} title={activeVideoTitle} />
                                {activeVideoTitle && <p className="profile-video-player__title">{activeVideoTitle}</p>}
                                <button className="profile-video-player__close" onClick={() => setActiveVideoId(null)}>
                                  ✕ Close
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="profile-empty">No favorited videos yet — heart a video on any game page to add it here.</p>
                        )}
                      </section>

                      <section className="profile-section">
                        <div className="profile-section__header">
                          <h2 className="profile-section__title">Favorite BGM</h2>
                        </div>
                        {favBGM.length > 0 ? (
                          <>
                            <div className="profile-hscroll">
                              {favBGM.map((v, i) => (
                                <VideoCard
                                  key={v.id ?? i}
                                  video={v}
                                  isActive={activeVideoId === v.external_id}
                                  onClick={() => handleVideoClick(v)}
                                />
                              ))}
                            </div>
                            {activeInBGM && (
                              <div className="profile-video-player">
                                <YouTubeEmbed videoId={activeVideoId} title={activeVideoTitle} />
                                {activeVideoTitle && <p className="profile-video-player__title">{activeVideoTitle}</p>}
                                <button className="profile-video-player__close" onClick={() => setActiveVideoId(null)}>
                                  ✕ Close
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="profile-empty">No favorited BGM yet — heart a track from the Music section on any game page.</p>
                        )}
                      </section>
                    </>
                  )
                })()}

                {/* Favorite Characters */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Favorite Characters</h2>
                  </div>
                  {favChars.length > 0 ? (
                    <div className="profile-char-grid">
                      {favChars.map((c, i) => (
                        <CharCard
                          key={c.id ?? i}
                          char={c}
                          onClick={() => handleCharClick(c)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">No favorited characters yet — heart a character to add them here.</p>
                  )}
                </section>

                {/* Favorite Artworks */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Favorite Artworks</h2>
                  </div>
                  {favArtworks.length > 0 ? (
                    <div className="profile-artwork-grid">
                      {favArtworks.map((a, i) => (
                        <ArtworkCard
                          key={a.id ?? i}
                          art={a}
                          onUnfav={handleUnfavArtwork}
                          onOpen={setActiveArtwork}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">No favorited artworks yet — heart an artwork on any game's Official Artworks tab.</p>
                  )}
                </section>
              </>
            )}

          </main>
        </div>
      </div>

      {showBoardModal && (
        <BoardUploadModal
          onAdd={handleAddBoard}
          onClose={() => setShowBoardModal(false)}
        />
      )}
      {activeBoard && (
        <BoardLightbox board={activeBoard} onClose={() => setActiveBoard(null)} />
      )}
      {activeArtwork && (
        <ImageLightbox
          src={activeArtwork.source_url || activeArtwork.thumbnail_url}
          title={activeArtwork.title}
          sourceUrl={activeArtwork.source_url}
          onClose={() => setActiveArtwork(null)}
        />
      )}
    </div>
  )
}
