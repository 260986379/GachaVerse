import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../data/games'
import GameCard from '../components/GameCard'

import { loadYTApi } from '../utils/ytApi'
import { getRoleStyle } from '../utils/roles'
import './ExplorePage.css'

const API = import.meta.env.VITE_API_URL || '/api'

function SpotlightHero({ games }) {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const playerRef = useRef(null)
  const embedWrapRef = useRef(null)
  const firstRender = useRef(true)
  const game = games[index]

  // Mount the IFrame API player once inside the embed wrap
  useEffect(() => {
    const wrap = embedWrapRef.current
    if (!wrap || !games[0]?.youtubeId) return

    const container = document.createElement('div')
    wrap.appendChild(container)

    let unmuteListener = null

    loadYTApi(() => {
      if (!wrap.isConnected) return
      playerRef.current = new window.YT.Player(container, {
        width: '100%',
        height: '100%',
        videoId: games[0].youtubeId,
        playerVars: { autoplay: 1, mute: 1, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            e.target.playVideo()
            // Browsers block unmuting on first page load without a user gesture.
            // Defer unmute until the first click anywhere on the page.
            unmuteListener = () => { e.target.unMute(); e.target.setVolume(10) }
            document.addEventListener('click', unmuteListener, { once: true })
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              setIndex(i => (i + 1) % games.length)
            }
          },
        },
      })
    })

    return () => {
      if (unmuteListener) document.removeEventListener('click', unmuteListener)
      playerRef.current?.destroy()
      playerRef.current = null
      container.remove()
    }
  }, [])

  // Load the new video when index changes (skip on first render)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const g = games[index]
    if (playerRef.current && g?.youtubeId) {
      playerRef.current.loadVideoById(g.youtubeId)
    }
  }, [index])

  const go = (dir) => setIndex(i => (i + dir + games.length) % games.length)

  const thumbUrl = game?.youtubeId
    ? `https://img.youtube.com/vi/${game.youtubeId}/maxresdefault.jpg`
    : null

  if (!game) return null

  return (
    <div className="spotlight" style={{ '--c1': game.color1, '--c2': game.color2 }}>
      <div className="spotlight__bg" />
      {thumbUrl && (
        <div className="spotlight__thumb" style={{ backgroundImage: `url(${thumbUrl})` }} />
      )}
      <div className="spotlight__gradient-top" />
      <div className="spotlight__gradient-left" />
      <div className="spotlight__gradient-bottom" />

      <div className="spotlight__body">
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
            <button className="spotlight__btn spotlight__btn--primary" onClick={() => navigate(`/game/${game.id}`, { state: { openTab: 'Official Videos' } })}>
              View Game
            </button>
          </div>
        </div>

        <div className="spotlight__embed-wrap" ref={embedWrapRef} />
      </div>

      <button className="spotlight__arrow spotlight__arrow--left" onClick={() => go(-1)}>‹</button>
      <button className="spotlight__arrow spotlight__arrow--right" onClick={() => go(1)}>›</button>

      <div className="spotlight__dots">
        {games.map((_, i) => (
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

function TrendingRow({ games }) {
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
        {games.map((game) => (
          <GameCard key={game.id} game={game} size="md" />
        ))}
      </div>
    </section>
  )
}

const MINIGAMES = [
  {
    id: 'concert-hall',
    name: 'Concert Hall',
    label: 'Music Minigame',
    icon: '🎵',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d0a5a 40%, #0d1a4a 100%)',
    path: '/minigame/concert-hall',
  },
  {
    id: 'gachafufu',
    name: 'Gachafufu',
    label: 'Gacha Minigame',
    icon: '🎰',
    gradient: 'linear-gradient(135deg, #2a0a1e 0%, #5a1a2d 40%, #3a1a00 100%)',
    path: '/minigame/gachafufu',
  },
]

function MinigameCard({ game }) {
  const navigate = useNavigate()
  return (
    <div className="minigame-card" onClick={() => navigate(game.path)}>
      <div className="minigame-card__bg" style={{ background: game.gradient }} />
      <div className="minigame-card__overlay" />
      <span className="minigame-card__icon">{game.icon}</span>
      <div className="minigame-card__footer">
        <span className="minigame-card__label">{game.label}</span>
        <p className="minigame-card__name">{game.name}</p>
      </div>
    </div>
  )
}

function MinigamesSection() {
  return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">Minigames</h2>
      </div>
      <div className="minigames-row">
        {MINIGAMES.map(g => <MinigameCard key={g.id} game={g} />)}
      </div>
    </section>
  )
}

const GAMES_LIST_IDS = ['zenless-zone-zero', 'nikke', 'genshin-impact', 'honkai-star-rail', 'wuthering-waves']

function GamesListSection() {
  const navigate = useNavigate()
  const rowRef   = useRef(null)
  const scroll   = (dir) => rowRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })
  const games    = GAMES_LIST_IDS.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean)

  return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">Games List</h2>
        <div className="section-header__right">
          <button className="section-view-all" onClick={() => navigate('/games')}>
            View all ›
          </button>
          <div className="section-arrows">
            <button className="section-arrow" onClick={() => scroll(-1)}>‹</button>
            <button className="section-arrow" onClick={() => scroll(1)}>›</button>
          </div>
        </div>
      </div>
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

  useEffect(() => {
    fetch(`${API}/users/community`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
  }, [])

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
  const [trendingGames, setTrendingGames] = useState([])

  useEffect(() => {
    fetch(`${API}/games/trending`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const resolved = data
          .map(({ slug, videoId, videoTitle }) => {
            const game = GAMES.find(g => g.id === slug)
            if (!game) return null
            return {
              ...game,
              youtubeId:    videoId    ?? game.youtubeId,
              youtubeTitle: videoTitle ?? game.youtubeTitle,
            }
          })
          .filter(Boolean)
        setTrendingGames(resolved)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="explore-page">
      {trendingGames.length > 0 && <SpotlightHero games={trendingGames} />}
      <div className="explore-content">
        {trendingGames.length > 0 && <TrendingRow games={trendingGames} />}
        <MinigamesSection />
        <GamesListSection />
        <CommunitySection />
      </div>
    </div>
  )
}
