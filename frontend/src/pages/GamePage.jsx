import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GAMES } from '../data/games'
import { loadYTApi } from '../utils/ytApi'
import NewsFeedTab from '../components/game/NewsFeedTab'
import MediaTab from '../components/game/MediaTab'
import CastTab from '../components/game/CastTab'
import './GamePage.css'

const TABS = ['News Feed', 'Media', 'Cast', 'Lore', 'Community', 'Guides', 'More like this']

function TabPanel({ tab, gameId }) {
  if (tab === 'News Feed') return <NewsFeedTab gameId={gameId} />
  if (tab === 'Media') return <MediaTab gameId={gameId} />
  if (tab === 'Cast') return <CastTab gameId={gameId} />
  return (
    <div className="tab-panel">
      <p className="placeholder-text">{tab} coming soon.</p>
    </div>
  )
}

function VolumeIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      {muted ? (
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18V20.1c1.16-.3 2.22-.86 3.1-1.61l2.32 2.33L21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      ) : (
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      )}
    </svg>
  )
}

export default function GamePage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = GAMES.find((g) => g.id === gameId)

  const [videoVisible, setVideoVisible] = useState(false)
  const [volume, setVolume] = useState(0)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [posterFailed, setPosterFailed] = useState(false)
  const playerRef = useRef(null)
  const videoWrapRef = useRef(null)

  useEffect(() => {
    if (!game?.youtubeId) return
    const wrap = videoWrapRef.current
    if (!wrap) return

    const container = document.createElement('div')
    wrap.appendChild(container)

    loadYTApi(() => {
      if (!wrap.isConnected) return
      playerRef.current = new window.YT.Player(container, {
        videoId: game.youtubeId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          loop: 1,
          playlist: game.youtubeId,
        },
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: (e) => {
            if (e.data === 1) setVideoVisible(true)
          },
        },
      })
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
      setVideoVisible(false)
      setVolume(0)
    }
  }, [game?.youtubeId])

  const handleVolume = (val) => {
    setVolume(val)
    if (!playerRef.current) return
    if (val === 0) {
      playerRef.current.mute()
    } else {
      playerRef.current.unMute()
      playerRef.current.setVolume(val)
    }
  }

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
        <div
          className={`game-hero__video-wrap${videoVisible ? ' game-hero__video-wrap--visible' : ''}`}
          ref={videoWrapRef}
        />
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
            <div className="game-hero__actions">
              <div className="game-hero__volume">
                <button
                  className="game-hero__vol-btn"
                  onClick={() => handleVolume(volume === 0 ? 60 : 0)}
                >
                  <VolumeIcon muted={volume === 0} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolume(Number(e.target.value))}
                  className="game-hero__vol-slider"
                />
              </div>
            </div>
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
