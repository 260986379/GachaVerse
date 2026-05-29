import { useState, useEffect } from 'react'
import { GAMES } from '../data/games'
import GameCard from '../components/GameCard'
import './LibraryPage.css'

const API = import.meta.env.VITE_API_URL || '/api'
const GENRE_FILTERS = ['All', 'Action RPG', 'Turn-Based RPG', 'Tactical RPG', 'Tower Defense RPG', 'Shooter RPG']

export default function LibraryPage() {
  const [filter, setFilter] = useState('All')
  const [latestDates, setLatestDates] = useState({})

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    fetch(`${API}/games/latest-video-dates`)
      .then(r => r.json())
      .then(rows => {
        const map = {}
        rows.forEach(r => { map[r.slug] = r.latest_published_at })
        setLatestDates(map)
      })
      .catch(() => {})
  }, [])

  const filtered = (filter === 'All' ? GAMES : GAMES.filter(g => g.genre === filter))
    .slice()
    .sort((a, b) => {
      const da = latestDates[a.id] ? new Date(latestDates[a.id]) : new Date(0)
      const db = latestDates[b.id] ? new Date(latestDates[b.id]) : new Date(0)
      return db - da
    })

  return (
    <div className="library-page">
      <div className="library-header">
        <h1 className="library-header__title">Game Library</h1>
        <span className="library-header__count">{filtered.length} games</span>
      </div>
      <div className="library-content">
        <div className="library-filters">
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
        <div className="library-grid">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} size="lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
