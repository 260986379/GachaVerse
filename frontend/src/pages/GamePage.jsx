import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { GAMES } from '../data/games'
import { isFollowingGame, toggleFollowGame } from '../utils/bookmarks'
import NewsFeedTab from '../components/game/NewsFeedTab'
import MediaTab from '../components/game/MediaTab'
import OfficialArtTab from '../components/game/OfficialArtTab'
import CastTab from '../components/game/CastTab'
import CommunityTab from '../components/game/CommunityTab'
import NikkeCharactersTab from '../components/game/NikkeCharactersTab'
import './GamePage.css'

const TABS = ['News Feed', 'Community', 'Official Videos', 'Characters', 'Official Artworks', 'Official Platforms']

const PLATFORM_ICONS = {
  website: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  ),
}

const PLATFORM_COLORS = {
  website: '#4a90d9',
  twitter: '#e7e7e7',
  reddit: '#ff4500',
  discord: '#5865f2',
}

function TabPanel({ tab, gameId, youtubeId, youtubeTitle, initialCharId }) {
  if (tab === 'Community') return <CommunityTab gameId={gameId} />
  if (tab === 'News Feed') return <NewsFeedTab gameId={gameId} youtubeId={youtubeId} youtubeTitle={youtubeTitle} />
  if (tab === 'Official Videos') return <MediaTab gameId={gameId} />
  if (tab === 'Official Artworks') return <OfficialArtTab gameId={gameId} />
  if (tab === 'Characters') {
    if (gameId === 'nikke') return <NikkeCharactersTab />
    return <CastTab gameId={gameId} initialCharId={initialCharId} />
  }
  if (tab === 'Official Platforms') {
    const game = GAMES.find((g) => g.id === gameId)
    const platforms = game?.officialPlatforms || []
    return (
      <div className="official-platforms">
        {platforms.length === 0 ? (
          <p className="tab-status">No official platforms listed yet.</p>
        ) : (
          <div className="official-platforms__grid">
            {platforms.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="platform-card"
              >
                <span className="platform-card__icon" style={{ color: PLATFORM_COLORS[p.type] ?? '#aaa' }}>
                  {PLATFORM_ICONS[p.type]}
                </span>
                <span className="platform-card__name">{p.name}</span>
                <span className="platform-card__arrow">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="tab-panel">
      <p className="placeholder-text">{tab} coming soon.</p>
    </div>
  )
}

export default function GamePage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const game = GAMES.find((g) => g.id === gameId)

  const initialTab = location.state?.openTab ?? TABS[0]
  const initialCharId = location.state?.openCharId ?? null

  const [activeTab, setActiveTab] = useState(initialTab)
  const [posterFailed, setPosterFailed] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [gameId])
  const [following, setFollowing] = useState(() => game ? isFollowingGame(game.id) : false)

  const handleFollow = () => {
    if (!game) return
    const nowFollowing = toggleFollowGame({ id: game.id, name: game.name, genre: game.genre, color1: game.color1, color2: game.color2, youtubeId: game.youtubeId })
    setFollowing(nowFollowing)
  }

  const heroBg = game?.bannerImage
    ?? (game?.youtubeId ? `https://img.youtube.com/vi/${game.youtubeId}/maxresdefault.jpg` : null)

  if (!game) {
    return (
      <div className="game-page game-not-found">
        <h2>Game not found</h2>
        <button onClick={() => navigate('/')}>Back to Explore</button>
      </div>
    )
  }

  return (
    <div className="game-page">
      <div className="game-hero" style={{ '--c1': game.color1, '--c2': game.color2 }}>
        <div className="game-hero__bg" />
        {heroBg && (
          <img
            src={heroBg}
            alt=""
            className="game-hero__banner-img"
            style={game.bannerPosition ? { objectPosition: game.bannerPosition } : undefined}
            aria-hidden="true"
          />
        )}
        <div className="game-hero__shield" />
        <div className="game-hero__gradient" />

        <div className="game-hero__bottom">
          <div className="game-hero__poster">
            {game.youtubeId && !posterFailed ? (
              <img
                src={`https://img.youtube.com/vi/${game.youtubeId}/maxresdefault.jpg`}
                alt={game.name}
                className="game-hero__poster-img"
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <div className="game-hero__poster-fallback" />
            )}
          </div>

          <div className="game-hero__content">
            <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
            <div className="game-hero__tags">
              {game.tags.map((t) => (
                <span key={t} className="game-hero__tag">{t}</span>
              ))}
              <button
                className={`game-follow-btn${following ? ' game-follow-btn--on' : ''}`}
                onClick={handleFollow}
              >
                {following ? '✓ Following' : '+ Follow'}
              </button>
            </div>
            <h1 className="game-hero__title">{game.name}</h1>
            <p className="game-hero__meta">{game.developer} · {game.genre}</p>
            <p className="game-hero__desc">{game.description}</p>
          </div>
        </div>
      </div>

      <nav className="game-tabs-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`game-tab${activeTab === tab ? ' game-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="game-body">
        <aside className="game-info-panel">
          <h3 className="game-info-panel__title">Information</h3>
          {[
            { label: 'Status',    value: game.status,    live: true },
            { label: 'Platform',  value: game.platform },
            { label: 'Released',  value: game.released },
            { label: 'Developer', value: game.developer },
            { label: 'Publisher', value: game.publisher },
            { label: 'Genre',     value: game.genre },
            { label: 'Modes',     value: game.modes },
            { label: 'Rating',    value: game.rating },
          ].map(({ label, value, live }) => (
            <div key={label} className="game-info-row">
              <span className="game-info-row__label">{label}</span>
              <span className={`game-info-row__value${live ? ' game-info-row__value--live' : ''}`}>{value}</span>
            </div>
          ))}
        </aside>
        <div className="game-body__main">
          <div style={{ display: activeTab === 'News Feed' ? 'block' : 'none' }}>
            <NewsFeedTab gameId={game.id} youtubeId={game.youtubeId} youtubeTitle={game.youtubeTitle} isVisible={activeTab === 'News Feed'} />
          </div>
          {activeTab !== 'News Feed' && (
            <TabPanel tab={activeTab} gameId={game.id} youtubeId={game.youtubeId} youtubeTitle={game.youtubeTitle} initialCharId={initialCharId} />
          )}
        </div>
        <aside className="game-events-panel">
          <h3 className="game-events-panel__title">Important Events</h3>
          {game.events?.length ? (
            game.events.map((ev, i) => (
              <div key={i} className="game-event-card">
                <span className={`game-event-card__type game-event-card__type--${ev.type.toLowerCase().replace(/[\s/]+/g, '-')}`}>
                  {ev.type}
                </span>
                <p className="game-event-card__name">{ev.name}</p>
                <span className="game-event-card__ends">Ends {ev.ends}</span>
              </div>
            ))
          ) : (
            <p className="game-events-panel__empty">No active events.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
