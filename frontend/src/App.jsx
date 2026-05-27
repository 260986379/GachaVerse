import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar           from './components/Navbar'
import ExplorePage      from './pages/ExplorePage'
import GamePage         from './pages/GamePage'
import AccountPage      from './pages/AccountPage'
import LibraryPage      from './pages/LibraryPage'
import CommunityPage    from './pages/CommunityPage'
import SettingsPage     from './pages/SettingsPage'
import UserProfilePage  from './pages/UserProfilePage'
import './App.css'

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
      </Routes>
    </AuthProvider>
  )
}
