import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavVideos, getFavChars, getFollowedGames } from '../utils/bookmarks'
import YouTubeEmbed from '../components/ui/YouTubeEmbed'
import GameCard from '../components/GameCard'
import './AccountPage.css'

const SHOWCASE_GAMES = [
  { id: 'zenless-zone-zero', name: 'Zenless Zone Zero', color1: '#f59e42', color2: '#b04a00' },
  { id: 'nikke',             name: 'NIKKE',             color1: '#4a90e2', color2: '#1a3a6a' },
]

function SocialStat({ label, value }) {
  return (
    <div className="ps-social-stat">
      <span className="ps-social-stat__value">{value}</span>
      <span className="ps-social-stat__label">{label}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="ps-info-row">
      <span className="ps-info-row__label">{label}</span>
      <span className="ps-info-row__value">{value}</span>
    </div>
  )
}

function GameAccountCard({ game }) {
  return (
    <div className="ps-game-card" style={{ '--g1': game.color1, '--g2': game.color2 }}>
      <div className="ps-game-card__cover" />
      <div className="ps-game-card__body">
        <p className="ps-game-card__name">{game.name}</p>
        <div className="ps-game-card__stats">
          <span className="ps-game-card__stat"><span>UID</span><span>—</span></span>
          <span className="ps-game-card__stat"><span>Level</span><span>—</span></span>
          <span className="ps-game-card__stat"><span>Rank</span><span>—</span></span>
        </div>
      </div>
    </div>
  )
}

function VideoCard({ video, isActive, onClick }) {
  return (
    <button
      className={`ps-video-card${isActive ? ' ps-video-card--active' : ''}`}
      onClick={onClick}
    >
      <div className="ps-video-card__thumb">
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
          : <div className="ps-video-card__thumb-fallback" />
        }
        <div className="ps-video-card__play">▶</div>
      </div>
      <p className="ps-video-card__title">{video.title}</p>
    </button>
  )
}

function CharCard({ char, onClick }) {
  return (
    <button className="ps-char-card" onClick={onClick}>
      <div className="ps-char-card__portrait">
        {char.icon_url
          ? <img src={char.icon_url} alt={char.display_name || char.name} loading="lazy" />
          : <div className="ps-char-card__fallback">{(char.display_name || char.name)[0]}</div>
        }
      </div>
      <p className="ps-char-card__name">{char.display_name || char.name}</p>
    </button>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const [favVideos,      setFavVideos]      = useState([])
  const [favChars,       setFavChars]       = useState([])
  const [followedGames,  setFollowedGames]  = useState([])
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [activeVideoTitle, setActiveVideoTitle] = useState('')

  useEffect(() => {
    setFavVideos(getFavVideos())
    setFavChars(getFavChars())
    setFollowedGames(getFollowedGames())
  }, [])

  const handleVideoClick = (video) => {
    if (activeVideoId === video.external_id) {
      setActiveVideoId(null)
      setActiveVideoTitle('')
    } else {
      setActiveVideoId(video.external_id)
      setActiveVideoTitle(video.title)
    }
  }

  const handleCharClick = (char) => {
    const slug = char.game_slug
    if (!slug) return
    navigate(`/game/${slug}`, { state: { openTab: 'Characters', openCharId: char.id } })
  }

  return (
    <div className="profile-page">
      <div className="profile-inner">

        {/* Banner */}
        <div className="profile-banner">
          <div className="profile-banner__fade" />
        </div>

        <div className="profile-layout">

          {/* ── Left sidebar ── */}
          <aside className="profile-sidebar">
            <h2 className="profile-sidebar__name">Guest User's Profile</h2>

            <div className="profile-sidebar__card">
              <div className="profile-pfp">
                <div className="profile-pfp__hint">
                  <span>+</span>
                  <span>Add Photo</span>
                </div>
              </div>

              {/* Following / Followers */}
              <div className="profile-sidebar__social">
                <SocialStat label="Following" value="0" />
                <div className="profile-sidebar__social-divider" />
                <SocialStat label="Followers" value="0" />
              </div>

              <div className="profile-sidebar__info">
                <InfoRow label="Last Online" value="—" />
                <InfoRow label="Birthday"    value="—" />
                <InfoRow label="Joined"      value="—" />
              </div>
            </div>
          </aside>

          {/* ── Right main ── */}
          <main className="profile-main">

            {/* Board */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Board</h2>
              </div>
              <div className="profile-board">
                <div className="profile-board__slot profile-board__slot--empty" />
                <div className="profile-board__slot profile-board__slot--empty" />
                <div className="profile-board__slot profile-board__slot--empty" />
                <div className="profile-board__slot profile-board__slot--empty" />
                <button className="profile-board__add">
                  <span>+</span>
                </button>
              </div>
            </section>

            {/* Game Account Showcase */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Game Account Showcase</h2>
              </div>
              <div className="profile-hscroll">
                {SHOWCASE_GAMES.map((g) => <GameAccountCard key={g.id} game={g} />)}
              </div>
            </section>

            {/* Followed Games */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Followed Games</h2>
              </div>
              {followedGames.length > 0 ? (
                <div className="profile-hscroll">
                  {followedGames.map((g) => (
                    <GameCard key={g.id} game={g} />
                  ))}
                </div>
              ) : (
                <p className="profile-empty">No followed games yet — follow a game to add it here.</p>
              )}
            </section>

            {/* Favorite Videos */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Videos</h2>
              </div>
              {favVideos.length > 0 ? (
                <>
                  <div className="profile-hscroll">
                    {favVideos.map((v, i) => (
                      <VideoCard
                        key={v.id ?? i}
                        video={v}
                        isActive={activeVideoId === v.external_id}
                        onClick={() => handleVideoClick(v)}
                      />
                    ))}
                  </div>
                  {activeVideoId && (
                    <div className="profile-video-player">
                      <YouTubeEmbed videoId={activeVideoId} title={activeVideoTitle} />
                      {activeVideoTitle && <p className="profile-video-player__title">{activeVideoTitle}</p>}
                      <button className="profile-video-player__close" onClick={() => setActiveVideoId(null)}>
                        ✕ Close
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="profile-empty">No favorited videos yet — heart a video on any game page to add it here.</p>
              )}
            </section>

            {/* Favorite Characters */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Characters</h2>
              </div>
              {favChars.length > 0 ? (
                <div className="profile-char-grid">
                  {favChars.map((c, i) => (
                    <CharCard
                      key={c.id ?? i}
                      char={c}
                      onClick={() => handleCharClick(c)}
                    />
                  ))}
                </div>
              ) : (
                <p className="profile-empty">No favorited characters yet — heart a character to add them here.</p>
              )}
            </section>

          </main>
        </div>
      </div>
    </div>
  )
}
