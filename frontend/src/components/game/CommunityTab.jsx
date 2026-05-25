import { useState, useEffect } from 'react'
import { getBoardsByGame } from '../../utils/bookmarks'
import { Link } from 'react-router-dom'
import BoardLightbox from '../ui/BoardLightbox'
import './CommunityTab.css'

export default function CommunityTab({ gameId }) {
  const [pins, setPins] = useState(() => getBoardsByGame(gameId))
  const [activePin, setActivePin] = useState(null)

  useEffect(() => {
    const onStorage = () => setPins(getBoardsByGame(gameId))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [gameId])

  if (pins.length === 0) {
    return (
      <div className="community-empty">
        <p className="community-empty__text">No boards for this game yet.</p>
        <p className="community-empty__sub">
          Go to your <Link to="/account" className="community-empty__link">profile</Link> and add pictures to your board to share them here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="community-masonry">
        {pins.map((pin) => (
          <div key={pin.id} className="community-pin" onClick={() => setActivePin(pin)}>
            <div className="community-pin__img-wrap">
              <img src={pin.imageUrl} alt={pin.caption || pin.gameName} loading="lazy" />
            </div>
            {pin.caption && <p className="community-pin__caption">{pin.caption}</p>}
            <div className="community-pin__footer">
              <span className="community-pin__author">You</span>
            </div>
          </div>
        ))}
      </div>
      {activePin && (
        <BoardLightbox board={activePin} onClose={() => setActivePin(null)} />
      )}
    </>
  )
}
