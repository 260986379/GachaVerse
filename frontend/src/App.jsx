import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ExplorePage from './pages/ExplorePage'
import GamePage from './pages/GamePage'
import AccountPage from './pages/AccountPage'
import LibraryPage from './pages/LibraryPage'
import './App.css'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/games" element={<LibraryPage />} />
      </Routes>
    </>
  )
}
