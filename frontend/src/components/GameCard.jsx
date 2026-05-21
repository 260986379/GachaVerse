import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GameCard.css'

export default function GameCard({ game, size = 'md' }) {
  const navigate = useNavigate()
  const [imgFailed, setImgFailed] = useState(false)

  const thumbUrl = game.youtubeId && !imgFailed
    ? `https://img.youtube.com/vi/${game.youtubeId}/maxresdefault.jpg`
    : null

  return (
    <div
      className={`game-card game-card--${size}`}
      onClick={() => navigate(`/game/${game.id}`)}
      style={{ '--c1': game.color1, '--c2': game.color2 }}
    >
      <div className="game-card__poster">
        {thumbUrl ? (
          <img
            className="game-card__thumb"
            src={thumbUrl}
            alt={game.name}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="game-card__initial">{game.name[0]}</span>
        )}
        <div className="game-card__overlay">
          <span className="game-card__play-icon">▶</span>
        </div>
      </div>
      <div className="game-card__info">
        <p className="game-card__name">{game.name}</p>
        <span className="game-card__genre">{game.genre}</span>
      </div>
    </div>
  )
}
