import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SearchModal.css'
import './NotifPanel.css'

const GAME_COLOR = {
  'zenless-zone-zero': '#f59e42',
  'nikke':             '#4a90e2',
  'genshin-impact':    '#c9a227',
  'honkai-star-rail':  '#a78bfa',
  'wuthering-waves':   '#22d3ee',
}

const GAME_SHORT = {
  'zenless-zone-zero': 'ZZZ',
  'nikke':             'NIKKE',
  'genshin-impact':    'Genshin',
  'honkai-star-rail':  'HSR',
  'wuthering-waves':   'WuWa',
}

const SOCIAL_LABEL = {
  profile_note:  'left a note on your profile',
  board_comment: 'commented on your board',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotifPanel({ items, socialItems = [], loading, unreadCount, lastSeen, markAllRead, followingAnyGame, onClose }) {
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState(null)
  const [tab, setTab] = useState('games')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isUnread = (item) => !lastSeen || new Date(item.published_at) > new Date(lastSeen)

  const handleItem = (item) => {
    markAllRead()
    navigate(`/game/${item.game_slug}`, {
      state: { openTab: 'Official Videos', openVideoId: item.external_id },
    })
    onClose()
  }

  const handleSocialItem = (notif) => {
    markAllRead()
    navigate('/account')
    onClose()
  }

  const unread = items.filter(isUnread)
  const read   = items.filter(i => !isUnread(i))
  const socialUnread = socialItems.filter(n => !n.read)
  const socialRead   = socialItems.filter(n => n.read)

  const gameUnreadCount   = unread.length
  const socialUnreadCount = socialUnread.length

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()}>
      <div className="notif-panel-anchor">
        <div className="search-modal notif-panel">

          {/* Header */}
          <div className="search-modal__header">
            <BellIcon className="search-modal__icon notif-panel__bell-icon" />
            <span className="notif-panel__title">Updates</span>
            {unreadCount > 0 && (
              <button className="notif-panel__mark-read" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
            <button className="search-modal__close" onClick={onClose}>✕</button>
          </div>

          {/* Tabs */}
          <div className="notif-panel__tabs">
            <button
              className={`notif-panel__tab${tab === 'games' ? ' notif-panel__tab--active' : ''}`}
              onClick={() => setTab('games')}
            >
              Game Updates
              {gameUnreadCount > 0 && <span className="notif-panel__tab-badge">{gameUnreadCount}</span>}
            </button>
            <button
              className={`notif-panel__tab${tab === 'users' ? ' notif-panel__tab--active' : ''}`}
              onClick={() => setTab('users')}
            >
              User Updates
              {socialUnreadCount > 0 && <span className="notif-panel__tab-badge">{socialUnreadCount}</span>}
            </button>
          </div>

          {/* Body */}
          <div className="search-modal__results notif-panel__list" onMouseLeave={() => setHoveredItem(null)}>
            {loading ? (
              <p className="search-modal__hint">Loading…</p>
            ) : tab === 'games' ? (
              !followingAnyGame ? (
                <p className="search-modal__empty">Follow a game to see its video updates here.</p>
              ) : items.length === 0 ? (
                <p className="search-modal__empty">No updates yet for your followed games.</p>
              ) : (
                <>
                  {unread.map(item => (
                    <NotifItem key={item.id} item={item} unread onClick={() => handleItem(item)} onMouseEnter={() => setHoveredItem(item)} />
                  ))}
                  {read.length > 0 && (
                    <>
                      {unread.length > 0 && (
                        <div className="search-modal__section-label notif-panel__section--earlier">Earlier</div>
                      )}
                      {read.map(item => (
                        <NotifItem key={item.id} item={item} onClick={() => handleItem(item)} onMouseEnter={() => setHoveredItem(item)} />
                      ))}
                    </>
                  )}
                </>
              )
            ) : (
              socialItems.length === 0 ? (
                <p className="search-modal__empty">No user activity yet.</p>
              ) : (
                <>
                  {socialUnread.map(n => (
                    <SocialNotifItem key={n.id} notif={n} unread onClick={() => handleSocialItem(n)} />
                  ))}
                  {socialRead.map(n => (
                    <SocialNotifItem key={n.id} notif={n} onClick={() => handleSocialItem(n)} />
                  ))}
                </>
              )
            )}
          </div>

        </div>

        {/* ── Game video hover preview panel ── */}
        {hoveredItem && tab === 'games' && (
          <div className="notif-preview-panel">
            <div className="notif-preview__thumb-wrap">
              {hoveredItem.thumbnail_url
                ? <img className="notif-preview__thumb" src={hoveredItem.thumbnail_url} alt={hoveredItem.title} draggable={false} />
                : <div className="notif-preview__thumb-fallback" style={{ '--c': GAME_COLOR[hoveredItem.game_slug] || '#333' }} />
              }
              <div
                className="notif-preview__gradient"
                style={{ background: `linear-gradient(to top, ${GAME_COLOR[hoveredItem.game_slug] ?? '#111'} 0%, transparent 60%)` }}
              />
            </div>
            <div className="notif-preview__info">
              <div className="notif-preview__meta">
                <span className="notif-preview__game" style={{ color: GAME_COLOR[hoveredItem.game_slug] }}>
                  {GAME_SHORT[hoveredItem.game_slug] || hoveredItem.game_name}
                </span>
                <span className="notif-item__dot">·</span>
                <span className="notif-preview__cat">{hoveredItem.category}</span>
              </div>
              <p className="notif-preview__title">{hoveredItem.title}</p>
              <span className="notif-preview__time">{timeAgo(hoveredItem.published_at)}</span>
            </div>
          </div>
        )}

      </div>
      </div>
    </div>
  )
}

function SocialNotifItem({ notif, unread, onClick }) {
  return (
    <button
      className={`search-modal__result notif-item notif-item--social${unread ? ' notif-item--unread' : ''}`}
      onClick={onClick}
    >
      <div className="notif-item__thumb notif-item__thumb--avatar">
        {notif.actor_avatar
          ? <img src={notif.actor_avatar} alt={notif.actor_username} loading="lazy" />
          : <span className="notif-item__thumb-initial">{notif.actor_username[0].toUpperCase()}</span>
        }
      </div>
      <div className="search-modal__result-info">
        <span className="notif-item__social-text">
          <strong>{notif.actor_username}</strong>
          {' '}{SOCIAL_LABEL[notif.type] ?? 'interacted with you'}
          {unread && <span className="notif-item__new-badge">NEW</span>}
        </span>
        <span className="search-modal__result-meta">{timeAgo(notif.created_at)}</span>
      </div>
      <span className="search-modal__result-arrow">›</span>
    </button>
  )
}

function NotifItem({ item, unread, onClick, onMouseEnter }) {
  const color = GAME_COLOR[item.game_slug] || 'rgba(255,255,255,0.4)'
  const short = GAME_SHORT[item.game_slug] || item.game_name

  return (
    <button
      className={`search-modal__result notif-item${unread ? ' notif-item--unread' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="notif-item__thumb">
        {item.thumbnail_url
          ? <img src={item.thumbnail_url} alt={item.title} loading="lazy" />
          : <div className="notif-item__thumb-fallback" style={{ '--c': color }} />
        }
      </div>

      <div className="search-modal__result-info">
        <span className="notif-item__meta">
          <span className="notif-item__game-tag" style={{ color }}>{short}</span>
          <span className="notif-item__dot">·</span>
          <span className="notif-item__category">{item.category}</span>
          {unread && <span className="notif-item__new-badge">NEW</span>}
        </span>
        <span className="search-modal__result-name notif-item__title">{item.title}</span>
        <span className="search-modal__result-meta">{timeAgo(item.published_at)}</span>
      </div>

      <span className="search-modal__result-arrow">›</span>
    </button>
  )
}

function BellIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
      <path d="M10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
    </svg>
  )
}
