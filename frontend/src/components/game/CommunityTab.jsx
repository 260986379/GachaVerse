import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BoardLightbox from '../ui/BoardLightbox'
import './CommunityTab.css'

const API = import.meta.env.VITE_API_URL || '/api'

export default function CommunityTab({ gameId }) {
  const navigate = useNavigate()
  const [boards,    setBoards]    = useState(null)   // null = loading
  const [activePin, setActivePin] = useState(null)

  useEffect(() => {
    setBoards(null)
    fetch(`${API}/boards/game/${encodeURIComponent(gameId)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]))
  }, [gameId])

  if (boards === null) return <p className="tab-status">Loading…</p>

  if (boards.length === 0) {
    return (
      <div className="community-empty">
        <p className="community-empty__text">No boards for this game yet.</p>
        <p className="community-empty__sub">
          Go to your profile and add pictures to your board to share them here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="community-masonry">
        {boards.map(pin => (
          <div key={pin.id} className="community-pin" onClick={() => setActivePin(pin)}>
            <div className="community-pin__img-wrap">
              <img src={pin.image_url} alt={pin.caption || pin.game_name} loading="lazy" />
            </div>
            {pin.caption && <p className="community-pin__caption">{pin.caption}</p>}
            <div
              className="community-pin__footer"
              onClick={e => { e.stopPropagation(); navigate(`/u/${pin.posted_by}`) }}
            >
              <div className="community-pin__avatar">
                {pin.posted_by_avatar
                  ? <img src={pin.posted_by_avatar} alt={pin.posted_by} />
                  : <span>{pin.posted_by[0].toUpperCase()}</span>
                }
              </div>
              <span className="community-pin__author">@{pin.posted_by}</span>
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
