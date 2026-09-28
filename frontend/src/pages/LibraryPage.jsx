import { useState, useEffect } from 'react'
import { GAMES, IMPLEMENTED_GAME_IDS } from '../data/games'
import GameCard from '../components/GameCard'
import { useAuth } from '../context/AuthContext'
import SuggestEntry from '../components/ui/SuggestEntry'
import './LibraryPage.css'

const API = import.meta.env.VITE_API_URL || '/api'
const GENRE_FILTERS = ['All', 'Action RPG', 'Turn-Based RPG', 'Tactical RPG', 'Tower Defense RPG', 'Shooter RPG']

export default function LibraryPage() {
  const { user } = useAuth()
  // Owner/Dev can open Coming Soon games to preview them; everyone else sees them locked.
  const isMod = ['Owner', 'Dev'].includes(user?.role)
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

  const sortByDate = (a, b) => {
    const da = latestDates[a.id] ? new Date(latestDates[a.id]) : new Date(0)
    const db = latestDates[b.id] ? new Date(latestDates[b.id]) : new Date(0)
    return db - da
  }

  const base = filter === 'All' ? GAMES : GAMES.filter(g => g.genre === filter)
  const implemented = base.filter(g =>  IMPLEMENTED_GAME_IDS.has(g.id)).slice().sort(sortByDate)
  const upcoming    = base.filter(g => !IMPLEMENTED_GAME_IDS.has(g.id)).slice().sort(sortByDate)

  return (
    <div className="library-page">
      <div className="library-header">
        <h1 className="library-header__title">Game Library</h1>
        <span className="library-header__count">{implemented.length + upcoming.length} games</span>
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

        {implemented.length > 0 && (
          <div className="library-grid">
            {implemented.map((game) => (
              <GameCard key={game.id} game={game} size="lg" />
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <div className="library-section-divider">
              <span className="library-section-divider__label">Coming Soon</span>
              <SuggestEntry />
            </div>
            <div className="library-grid library-grid--upcoming">
              {upcoming.map((game) => (
                <GameCard key={game.id} game={game} size="lg" locked={!isMod} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
