import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SearchModal from './ui/SearchModal'
import './Navbar.css'

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.337 0-10 1.671-10 5v1a1 1 0 001 1h18a1 1 0 001-1v-1c0-3.329-6.663-5-10-5z"/>
    </svg>
  )
}

const HIDE_SEARCH_ON = ['/account']

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const showSearch = !HIDE_SEARCH_ON.includes(location.pathname)

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar__brand">MyGachaList</Link>
        <div className="navbar__right">
          {showSearch && (
            <button
              className="navbar__search"
              onClick={() => setSearchOpen(true)}
              aria-label="Search games"
            >
              <span className="navbar__search-icon">⌕</span>
              <span className="navbar__search-placeholder">Search games...</span>
            </button>
          )}
          <Link to="/account" className="navbar__profile-btn" aria-label="Profile">
            <ProfileIcon />
          </Link>
        </div>
      </nav>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  )
}
