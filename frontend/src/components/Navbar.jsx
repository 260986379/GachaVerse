import { Link } from 'react-router-dom'
import './Navbar.css'

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.337 0-10 1.671-10 5v1a1 1 0 001 1h18a1 1 0 001-1v-1c0-3.329-6.663-5-10-5z"/>
    </svg>
  )
}

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">GachaVerse</Link>
      <div className="navbar__right">
        <div className="navbar__search">
          <span className="navbar__search-icon">⌕</span>
          <input className="navbar__search-input" type="text" placeholder="Search games..." />
        </div>
        <Link to="/account" className="navbar__profile-btn" aria-label="Profile">
          <ProfileIcon />
        </Link>
      </div>
    </nav>
  )
}
