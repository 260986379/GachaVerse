import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES, FEATURED_GAMES } from '../data/games'
import GameCard from '../components/GameCard'
import { getFollowedGames } from '../utils/bookmarks'
import { loadYTApi } from '../utils/ytApi'
import { getRoleStyle } from '../utils/roles'
import { useAuth } from '../context/AuthContext'
import './ExplorePage.css'

const API = import.meta.env.VITE_API_URL || '/api'

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

function SpotlightHero() {
  const [index, setIndex] = useState(0)
  const [videoVisible, setVideoVisible] = useState(false)
  const [volume, setVolume] = useState(0)
  const navigate = useNavigate()
  const playerRef = useRef(null)
  const videoWrapRef = useRef(null)
  const game = FEATURED_GAMES[index]

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

  // Initialize the YT player once, imperatively inside the wrapper div
  useEffect(() => {
    const wrap = videoWrapRef.current
    if (!wrap || !FEATURED_GAMES[0].youtubeId) return

    const container = document.createElement('div')
    wrap.appendChild(container)

    loadYTApi(() => {
      if (!wrap.isConnected) return
      playerRef.current = new window.YT.Player(container, {
        videoId: FEATURED_GAMES[0].youtubeId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: (e) => {
            if (e.data === 1) setVideoVisible(true)
            if (e.data === 0) setIndex((i) => (i + 1) % FEATURED_GAMES.length)
          },
        },
      })
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  // When index changes after mount, load the new video into the existing player
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const g = FEATURED_GAMES[index]
    if (playerRef.current && g.youtubeId) {
      setVideoVisible(false)
      setVolume(0)
      playerRef.current.mute()
      playerRef.current.loadVideoById(g.youtubeId)
    }
  }, [index])

  const go = (dir) => {
    setIndex((i) => (i + dir + FEATURED_GAMES.length) % FEATURED_GAMES.length)
  }

  return (
    <div className="spotlight" style={{ '--c1': game.color1, '--c2': game.color2 }}>
      <div className="spotlight__bg" />
      <div
        className={`spotlight__video-wrap${videoVisible ? ' spotlight__video-wrap--visible' : ''}`}
        ref={videoWrapRef}
      />

      <div className="spotlight__gradient-top" />
      <div className="spotlight__gradient-left" />
      <div className="spotlight__gradient-bottom" />
      <div className="spotlight__shield" />

      <div className="spotlight__content">
        <div className="spotlight__tags">
          {game.tags.map((t) => (
            <span key={t} className="spotlight__tag">{t}</span>
          ))}
        </div>
        <h1 className="spotlight__title">{game.name}</h1>
        <p className="spotlight__dev">{game.developer} · {game.genre}</p>
        <p className="spotlight__desc">{game.description}</p>
        <div className="spotlight__actions">
          <button className="spotlight__btn spotlight__btn--primary" onClick={() => navigate(`/game/${game.id}`)}>
            View Game
          </button>
          <div className="spotlight__volume">
            <button
              className="spotlight__vol-btn"
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
              className="spotlight__vol-slider"
            />
          </div>
        </div>
      </div>

      <button className="spotlight__arrow spotlight__arrow--left" onClick={() => go(-1)}>‹</button>
      <button className="spotlight__arrow spotlight__arrow--right" onClick={() => go(1)}>›</button>

      <div className="spotlight__dots">
        {FEATURED_GAMES.map((_, i) => (
          <button
            key={i}
            className={`spotlight__dot${i === index ? ' spotlight__dot--active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}

function BrowseAllCard() {
  const navigate = useNavigate()
  return (
    <div className="browse-all-card" onClick={() => navigate('/games')}>
      <div className="browse-all-card__poster">
        <span className="browse-all-card__icon">⊞</span>
        <span className="browse-all-card__label">Browse All Games</span>
      </div>
    </div>
  )
}

function TrendingRow() {
  const rowRef = useRef(null)
  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })

  return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">Trending Now</h2>
        <div className="section-arrows">
          <button className="section-arrow" onClick={() => scroll(-1)}>‹</button>
          <button className="section-arrow" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="trending-row" ref={rowRef}>
        {GAMES.filter((g) => g.id === 'nikke' || g.id === 'zenless-zone-zero').map((game) => (
          <GameCard key={game.id} game={game} size="md" />
        ))}
      </div>
    </section>
  )
}

const GENRE_FILTERS = ['All', 'Action RPG', 'Turn-Based RPG', 'Tactical RPG', 'Tower Defense RPG', 'Shooter RPG']

function MyGamesSection() {
  const rowRef = useRef(null)
  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })
  const [followed, setFollowed] = useState([])
  const [filter, setFilter] = useState('All')
  const { loadingAuth } = useAuth()

  // Re-read once auth settles so _uid is correctly scoped to the logged-in user
  useEffect(() => {
    if (loadingAuth) return
    setFollowed(getFollowedGames())
  }, [loadingAuth])

  // Keep in sync with follow/unfollow actions (same-tab custom event + cross-tab storage event)
  useEffect(() => {
    const sync = () => setFollowed(getFollowedGames())
    window.addEventListener('gv:followedGamesChanged', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('gv:followedGamesChanged', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const gameMap = Object.fromEntries(GAMES.map((g) => [g.id, g]))
  const allFollowed = followed.map((f) => gameMap[f.id]).filter(Boolean)
  const games = filter === 'All' ? allFollowed : allFollowed.filter((g) => g.genre === filter)

  return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">Followed Games</h2>
        {allFollowed.length > 0 && (
          <div className="section-arrows">
            <button className="section-arrow" onClick={() => scroll(-1)}>‹</button>
            <button className="section-arrow" onClick={() => scroll(1)}>›</button>
          </div>
        )}
      </div>
      <div className="filter-tabs">
        {GENRE_FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {allFollowed.length === 0 && (
        <p className="my-games-hint">Follow a game to see it here.</p>
      )}
      <div className="trending-row" ref={rowRef}>
        {games.map((game) => (
          <GameCard key={game.id} game={game} size="md" />
        ))}
        <BrowseAllCard />
      </div>
    </section>
  )
}

function UserCard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="community-card" onClick={() => navigate(`/u/${user.username}`)}>
      <div
        className="community-card__banner"
        style={{ backgroundImage: `url(${user.banner_url})` }}
      />
      <div className="community-card__body">
        <div className="community-card__avatar">
          <img src={user.avatar_url} alt={user.username} />
        </div>
        <p className="community-card__name" style={getRoleStyle(user.role)}>
          {user.username}
        </p>
        <p className="community-card__followers">
          {Number(user.followers_count).toLocaleString()} followers
        </p>
      </div>
    </div>
  )
}

function BrowseAllUsersCard() {
  const navigate = useNavigate()
  return (
    <div className="browse-all-card" onClick={() => navigate('/community')}>
      <div className="browse-all-card__poster browse-all-card__poster--users">
        <span className="browse-all-card__icon">👥</span>
        <span className="browse-all-card__label">Browse All Users</span>
      </div>
    </div>
  )
}

function CommunitySection() {
  const rowRef = useRef(null)
  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })
  const [users, setUsers] = useState(null)
  const { isLoggedIn, loadingAuth, authFetch } = useAuth()

  useEffect(() => {
    if (loadingAuth) return
    const fetchFn = isLoggedIn ? authFetch : fetch
    fetchFn(`${API}/users/community`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
  }, [loadingAuth, isLoggedIn])

  if (!users || users.length === 0) return null

  return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">Community</h2>
        <div className="section-arrows">
          <button className="section-arrow" onClick={() => scroll(-1)}>‹</button>
          <button className="section-arrow" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="trending-row" ref={rowRef}>
        {users.map(u => <UserCard key={u.id} user={u} />)}
        <BrowseAllUsersCard />
      </div>
    </section>
  )
}

export default function ExplorePage() {
  return (
    <div className="explore-page">
      <SpotlightHero />
      <div className="explore-content">
        <TrendingRow />
        <MyGamesSection />
        <CommunitySection />
      </div>
    </div>
  )
}
