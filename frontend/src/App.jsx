import { Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import Navbar           from './components/Navbar'
import ExplorePage      from './pages/ExplorePage'
import GamePage         from './pages/GamePage'
import AccountPage      from './pages/AccountPage'
import LibraryPage      from './pages/LibraryPage'
import CommunityPage    from './pages/CommunityPage'
import SettingsPage     from './pages/SettingsPage'
import UserProfilePage  from './pages/UserProfilePage'
import ModPage          from './pages/ModPage'
import AboutPage        from './pages/AboutPage'
import ConcertHallPage  from './pages/ConcertHallPage'
import GachafufuPage    from './pages/GachafufuPage'
import GalleryPage      from './pages/GalleryPage'
import './App.css'

function Footer() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isMod = ['Owner', 'Dev'].includes(user?.role)

  return (
    <footer className="site-footer">
      <button className="site-footer__about-btn" onClick={() => navigate('/about')}>
        About
      </button>
      <p className="site-footer__text">
        MyGachaList is an independent fan database and community platform. All games, characters,
        trademarks, and intellectual property featured on this site belong to their respective
        owners. MyGachaList is not affiliated with, endorsed by, or sponsored by any of the
        game publishers or developers listed.
      </p>
      {isMod && (
        <button className="site-footer__mod-btn" onClick={() => navigate('/mod')}>
          Moderation
        </button>
      )}
    </footer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/"             element={<ExplorePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/account"      element={<AccountPage />} />
        <Route path="/games"        element={<LibraryPage />} />
        <Route path="/community"    element={<CommunityPage />} />
        <Route path="/settings"     element={<SettingsPage />} />
        <Route path="/u/:username"  element={<UserProfilePage />} />
        <Route path="/mod"          element={<ModPage />} />
        <Route path="/about"        element={<AboutPage />} />
        <Route path="/gallery"               element={<GalleryPage />} />
        <Route path="/minigame/concert-hall" element={<ConcertHallPage />} />
        <Route path="/minigame/gachafufu"    element={<GachafufuPage />} />
      </Routes>
      <Footer />
    </AuthProvider>
  )
}
