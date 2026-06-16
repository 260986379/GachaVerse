import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BoardLightbox from '../components/ui/BoardLightbox'
import ImageLightbox from '../components/ui/ImageLightbox'
import { isFavArtwork, toggleFavArtwork } from '../utils/bookmarks'
import '../components/game/CommunityTab.css'
import './GalleryPage.css'

const API = import.meta.env.VITE_API_URL || '/api'
const TABS = ['Boards', 'Official Artworks']

function AllBoardsTab() {
  const navigate   = useNavigate()
  const [boards,    setBoards]    = useState(null)
  const [activePin, setActivePin] = useState(null)

  useEffect(() => {
    fetch(`${API}/boards/all`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]))
  }, [])

  if (boards === null) return <p className="tab-status">Loading…</p>
  if (boards.length === 0) return <p className="tab-status">No boards yet.</p>

  return (
    <>
      <div className="community-masonry">
        {boards.map(pin => (
          <div key={pin.id} className="community-pin" onClick={() => setActivePin(pin)}>
            <div className="community-pin__img-wrap">
              <img src={pin.image_url} alt={pin.caption || pin.game_name} loading="lazy" />
            </div>
            {pin.game_name && (
              <span className="gallery-pin__game">{pin.game_name}</span>
            )}
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
        <BoardLightbox
          board={activePin}
          boardOwner={activePin.posted_by_id ? {
            id:         activePin.posted_by_id,
            username:   activePin.posted_by,
            avatar_url: activePin.posted_by_avatar,
          } : null}
          onClose={() => setActivePin(null)}
        />
      )}
    </>
  )
}

function AllArtworksTab() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [active,    setActive]    = useState(null)
  const [brokenIds, setBrokenIds] = useState(new Set())
  const [favIds,    setFavIds]    = useState(() => new Set())

  useEffect(() => {
    fetch(`${API}/games/art/all`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        setItems(data)
        setFavIds(new Set(data.filter(i => isFavArtwork(i.id)).map(i => i.id)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="tab-status">Loading…</p>
  if (!items.length) return <p className="tab-status">No official artworks yet.</p>

  const markBroken = (id) => setBrokenIds(prev => new Set([...prev, id]))
  const visible    = items.filter(i => !brokenIds.has(i.id))

  const handleFav = (e, item) => {
    e.stopPropagation()
    const result = toggleFavArtwork({ ...item, gameId: item.game_id })
    if (result !== null) {
      setFavIds(prev => {
        const next = new Set(prev)
        result ? next.add(item.id) : next.delete(item.id)
        return next
      })
    }
  }

  // Group by game name
  const games = [...new Set(visible.map(i => i.game_name))]
  const groups = games.map(game => ({ game, items: visible.filter(i => i.game_name === game) }))

  const activeItem = active ? items.find(i => i.id === active) : null

  return (
    <>
      <div className="art-tab">
        {groups.map(({ game, items: groupItems }) => (
          <section key={game} className="media-section">
            <h3 className="media-section__title">{game}</h3>
            <div className="art-grid">
              {groupItems.map(item => (
                <div
                  key={item.id}
                  className="art-card"
                  onClick={() => setActive(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setActive(item.id)}
                >
                  <div className="art-card__thumb">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        loading="lazy"
                        onError={() => markBroken(item.id)}
                      />
                    ) : (
                      <div className="art-card__thumb-fallback" />
                    )}
                    <button
                      className={`art-card__fav${favIds.has(item.id) ? ' art-card__fav--on' : ''}`}
                      onClick={e => handleFav(e, item)}
                      title={favIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favIds.has(item.id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <p className="art-card__title">{item.title}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {activeItem && (
        <ImageLightbox
          src={activeItem.source_url || activeItem.thumbnail_url}
          title={activeItem.title}
          sourceUrl={activeItem.source_url}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}

export default function GalleryPage() {
  const [tab, setTab] = useState('Boards')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="gallery-page">
      <div className="gallery-tabs-bar">
        {TABS.map(t => (
          <button
            key={t}
            className={`game-tab${tab === t ? ' game-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="gallery-content">
        {tab === 'Boards'            && <AllBoardsTab />}
        {tab === 'Official Artworks' && <AllArtworksTab />}
      </div>
    </div>
  )
}
