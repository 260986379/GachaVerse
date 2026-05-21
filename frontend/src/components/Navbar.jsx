import { Link } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">GachaVerse</Link>
      <div className="navbar__search">
        <span className="navbar__search-icon">⌕</span>
        <input className="navbar__search-input" type="text" placeholder="Search games..." />
      </div>
    </nav>
  )
}
