import { useState, useEffect } from 'react'
import { GAMES } from '../data/games'
import GameCard from '../components/GameCard'
import './LibraryPage.css'

const GENRE_FILTERS = ['All', 'Action RPG', 'Turn-Based RPG', 'Tactical RPG', 'Tower Defense RPG', 'Shooter RPG']

export default function LibraryPage() {
  const [filter, setFilter] = useState('All')

  useEffect(() => { window.scrollTo(0, 0) }, [])
  const filtered = filter === 'All' ? GAMES : GAMES.filter((g) => g.genre === filter)

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
