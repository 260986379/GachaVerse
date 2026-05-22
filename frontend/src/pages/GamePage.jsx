import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GAMES } from '../data/games'
import NewsFeedTab from '../components/game/NewsFeedTab'
import MediaTab from '../components/game/MediaTab'
import OfficialArtTab from '../components/game/OfficialArtTab'
import CastTab from '../components/game/CastTab'
import './GamePage.css'

const TABS = ['News Feed', 'Official Videos', 'Official Artworks', 'Characters', 'More like this']

function TabPanel({ tab, gameId }) {
  if (tab === 'News Feed') return <NewsFeedTab gameId={gameId} />
  if (tab === 'Official Videos') return <MediaTab gameId={gameId} />
  if (tab === 'Official Artworks') return <OfficialArtTab gameId={gameId} />
  if (tab === 'Characters') return <CastTab gameId={gameId} />
  return (
    <div className="tab-panel">
      <p className="placeholder-text">{tab} coming soon.</p>
    </div>
  )
}

export default function GamePage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = GAMES.find((g) => g.id === gameId)

  const [activeTab, setActiveTab] = useState(TABS[0])
  const [posterFailed, setPosterFailed] = useState(false)

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
          <img src={heroBg} alt="" className="game-hero__banner-img" aria-hidden="true" />
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
          <TabPanel tab={activeTab} gameId={game.id} />
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
