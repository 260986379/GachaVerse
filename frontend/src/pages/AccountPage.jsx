import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  getFavVideos, getFavChars, getFavArtworks,
  toggleFavVideo, toggleFavChar, toggleFavArtwork, getFollowedGames, saveFollowedGames,
  saveFavVideos, saveFavArtworks,
  writeFavVideosLocal, writeFavCharsLocal, writeFavArtworksLocal,
  getProfileBanner, setProfileBanner, clearProfileBanner,
  getProfilePfp, setProfilePfp, clearProfilePfp,
} from '../utils/bookmarks'
import YouTubeEmbed from '../components/ui/YouTubeEmbed'
import BoardLightbox from '../components/ui/BoardLightbox'
import SharePopover  from '../components/ui/SharePopover'
import ImageLightbox from '../components/ui/ImageLightbox'
import AuthModal    from '../components/ui/AuthModal'
import ReportModal  from '../components/ui/ReportModal'
import MembershipModal from '../components/ui/MembershipModal'
import GameCard from '../components/GameCard'
import { GAMES } from '../data/games'
import { useAuth } from '../context/AuthContext'
import { getRoleStyle, getRoleGlow } from '../utils/roles'
import { profileBadges, isMember, hasActiveSubscription, hasPaymentProblem, displayRole } from '../utils/membership'
import { compressImage, blobToDataUrl, uploadImage, IMAGE_SIZES } from '../utils/imageUpload'
import './AccountPage.css'
import './UserProfilePage.css'

const SHOWCASE_GAMES = [
  { id: 'zenless-zone-zero', name: 'Zenless Zone Zero', color1: '#f59e42', color2: '#b04a00' },
  { id: 'nikke',             name: 'NIKKE',             color1: '#4a90e2', color2: '#1a3a6a' },
]

const GAME_ACCOUNT_META = {
  'zenless-zone-zero': {
    statLabels: ['Inter-Knot Lv', 'Agent Rank', 'Server', 'UID'],
    rosterLabel: 'Agents',
    pullLabel: 'Signal Searches',
  },
  'nikke': {
    statLabels: ['Commander Lv', 'Synchro Lv', 'Server', 'UID'],
    rosterLabel: 'Nikkes',
    pullLabel: 'Recruit History',
  },
}

const DEFAULT_GAME_META = {
  statLabels: ['Level', 'Rank', 'Server', 'UID'],
  rosterLabel: 'Characters',
  pullLabel: 'Gacha History',
}

const ACCOUNT_FEATURE_GAMES = new Set(['zenless-zone-zero', 'genshin-impact', 'honkai-star-rail'])

const GAME_CARD_STATS = {
  'zenless-zone-zero': (uid, pd) => [
    { label: 'UID',    value: uid },
    { label: 'Level',  value: pd?.level  ?? '—' },
    { label: 'Server', value: pd?.region ?? '—' },
  ],
  'genshin-impact': (uid, pd) => [
    { label: 'UID',    value: uid },
    { label: 'AR',     value: pd?.level  ?? '—' },
    { label: 'Server', value: pd?.region ?? '—' },
  ],
  'honkai-star-rail': (uid, pd) => [
    { label: 'UID',    value: uid },
    { label: 'TL',     value: pd?.level  ?? '—' },
    { label: 'Server', value: pd?.region ?? '—' },
  ],
}
function getCardStats(gameId, uid, pd) {
  return (GAME_CARD_STATS[gameId] ?? ((uid) => [
    { label: 'UID',   value: uid },
    { label: 'Level', value: '—' },
    { label: 'Rank',  value: '—' },
  ]))(uid, pd)
}

const GAME_VIEW_CONFIG = {
  'zenless-zone-zero': {
    rosterKey:    'agents',
    rosterLabel:  'Agent Showcase',
    levelLabel:   'Inter-Knot Lv',
    headerStatus: (pd) => `${pd.region} · Inter-Knot Lv.${pd.level}`,
  },
  'genshin-impact': {
    rosterKey:    'characters',
    rosterLabel:  'Character Showcase',
    levelLabel:   'Adventure Rank',
    headerStatus: (pd) => `${pd.region} · AR${pd.level}`,
    extraStats:   (pd) => [
      pd.worldLevel   != null && { label: 'World Level',   value: pd.worldLevel },
      pd.achievements != null && { label: 'Achievements',  value: pd.achievements.toLocaleString() },
      (pd.abyssFloor  != null && pd.abyssFloor > 0)
        && { label: 'Spiral Abyss', value: `Floor ${pd.abyssFloor}-${pd.abyssLevel}` },
    ].filter(Boolean),
  },
  'honkai-star-rail': {
    rosterKey:    'characters',
    rosterLabel:  'Character Showcase',
    levelLabel:   'Trailblaze Lv',
    headerStatus: (pd) => `${pd.region} · TL${pd.level}`,
    extraStats:   (pd) => [
      pd.worldLevel   != null && { label: 'Equilibrium Lv',   value: pd.worldLevel },
      pd.achievements != null && { label: 'Achievements',     value: pd.achievements.toLocaleString() },
      (pd.mocFloor    != null && pd.mocFloor > 0)
        && { label: 'Memory of Chaos', value: `Floor ${pd.mocFloor}` },
    ].filter(Boolean),
  },
}
const DEFAULT_VIEW_CONFIG = {
  rosterKey:    'characters',
  rosterLabel:  'Character Showcase',
  levelLabel:   'Level',
  headerStatus: (pd) => `${pd.region} · Lv.${pd.level}`,
}

function SocialStat({ label, value, onClick }) {
  return (
    <button className="ps-social-stat" onClick={onClick}>
      <span className="ps-social-stat__value">{value}</span>
      <span className="ps-social-stat__label">{label}</span>
    </button>
  )
}

const API = import.meta.env.VITE_API_URL || '/api'

function FollowListModal({ userId, tab: initialTab, onClose }) {
  const [tab,       setTab]       = useState(initialTab) // 'followers' | 'following'
  const [followers, setFollowers] = useState(null)
  const [following, setFollowing] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/users/${userId}/followers`).then(r => r.json()).then(setFollowers).catch(() => setFollowers([]))
    fetch(`${API}/users/${userId}/following`).then(r => r.json()).then(setFollowing).catch(() => setFollowing([]))
  }, [userId])

  const list = tab === 'followers' ? followers : following

  return (
    <div className="follow-modal-overlay" onClick={onClose}>
      <div className="follow-modal" onClick={e => e.stopPropagation()}>

        <div className="follow-modal__header">
          <div className="follow-modal__tabs">
            <button
              className={`follow-modal__tab${tab === 'followers' ? ' follow-modal__tab--active' : ''}`}
              onClick={() => setTab('followers')}
            >Followers</button>
            <button
              className={`follow-modal__tab${tab === 'following' ? ' follow-modal__tab--active' : ''}`}
              onClick={() => setTab('following')}
            >Following</button>
          </div>
          <button className="follow-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="follow-modal__list">
          {list === null ? (
            <p className="follow-modal__empty">Loading…</p>
          ) : list.length === 0 ? (
            <p className="follow-modal__empty">
              {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            list.map(u => (
              <div key={u.id} className="follow-modal__item">
                <div className="follow-modal__pfp">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.username} />
                    : <span>{u.username[0].toUpperCase()}</span>
                  }
                </div>
                <span className="follow-modal__username">{u.username}</span>
              </div>
            ))
          )}
        </div>

      </div>
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

function timeAgoShort(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ratingColor(r) {
  if (r >= 8) return '#4ade80'
  if (r >= 5) return '#facc15'
  return '#f87171'
}

function formatGameSlug(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function MyReviewsModal({ userId, authFetch, onClose, onStatsChange }) {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const [totals, setTotals] = useState({ total: 0, totalUpvotes: 0 })

  useEffect(() => {
    fetch(`${API}/reviews/user/${userId}`)
      .then(r => r.json())
      .then(data => {
        // Paginated shape is { items, hasMore, total, totalUpvotes }; tolerate a
        // bare array so a stale cached bundle still renders.
        const list = Array.isArray(data) ? data : (data?.items ?? [])
        setReviews(list)
        setTotals(Array.isArray(data)
          ? { total: list.length, totalUpvotes: list.reduce((s, r) => s + (r.upvote_count || 0), 0) }
          : { total: data?.total ?? list.length, totalUpvotes: data?.totalUpvotes ?? 0 })
      })
      .catch(() => setReviews([]))
  }, [userId])

  // Server-computed, so this stays correct when the list is only one page.
  const totalUpvotes = totals.totalUpvotes

  const handleDelete = async (reviewId) => {
    const res = await authFetch(`${API}/reviews/review/${reviewId}`, { method: 'DELETE' })
    if (res.ok) {
      const removed = reviews.find(r => r.id === reviewId)
      const next = reviews.filter(r => r.id !== reviewId)
      setReviews(next)
      // Adjust the server totals rather than re-summing the page, which would
      // report only the rows currently loaded.
      const nextTotals = {
        total: Math.max(0, totals.total - 1),
        totalUpvotes: Math.max(0, totals.totalUpvotes - (removed?.upvote_count || 0)),
      }
      setTotals(nextTotals)
      onStatsChange({ review_count: nextTotals.total, total_upvotes: nextTotals.totalUpvotes })
    }
  }

  return (
    <div className="rv-modal-overlay" onClick={onClose}>
      <div className="rv-modal" onClick={e => e.stopPropagation()}>
        <div className="rv-modal__header">
          <span className="rv-modal__title">
            My Reviews
            {reviews?.length > 0 && <span className="rv-modal__count">{reviews.length}</span>}
            {totalUpvotes > 0 && <span className="rv-modal__upvote-total">▲ {totalUpvotes}</span>}
          </span>
          <button className="rv-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="rv-modal__list">
          {reviews === null && <p className="rv-modal__empty">Loading…</p>}
          {reviews?.length === 0 && (
            <p className="rv-modal__empty">No reviews yet — head to any game's News Feed to leave one.</p>
          )}
          {reviews?.map(r => (
            <div
              key={r.id}
              className="rv-card"
              style={{ '--rc': ratingColor(r.rating) }}
            >
              <div className="rv-card__body-col">
                <button
                  className="rv-card__game"
                  onClick={() => { navigate(`/game/${r.game_id}`); onClose() }}
                >
                  {formatGameSlug(r.game_id)}
                  <span className="rv-card__game-arrow">↗</span>
                </button>
                {r.body && <p className="rv-card__text">{r.body}</p>}
                <div className="rv-card__footer">
                  {r.upvote_count > 0 && (
                    <span className="rv-card__upvotes">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                        <path d="M4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1 1 0 0 0 .77-1.64l-8-10a1 1 0 0 0-1.54 0l-8 10A1 1 0 0 0 4 14z"/>
                      </svg>
                      {r.upvote_count}
                    </span>
                  )}
                  <span className="rv-card__date">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <button className="rv-card__delete" onClick={() => handleDelete(r.id)} title="Delete review">
                    Delete
                  </button>
                </div>
              </div>

              <div className="rv-card__score-col">
                <span className="rv-card__rating">{r.rating}</span>
                <span className="rv-card__denom">/10</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewNotesModal({ notes, onClose }) {
  const navigate = useNavigate()
  const [reportingNote, setReportingNote] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="note-modal-overlay" onClick={onClose}>
      <div className="note-modal note-modal--view" onClick={e => e.stopPropagation()}>
        <div className="note-modal__header">
          <span className="note-modal__title">
            Notes{notes.length > 0 ? ` · ${notes.length}` : ''}
          </span>
          <button className="note-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="note-modal__list">
          {notes.length === 0 ? (
            <p className="note-modal__empty">No notes yet. They'll appear here when other users leave one.</p>
          ) : (
            notes.map(n => (
              <div key={n.id} className="note-modal__item">
                <button
                  className="note-modal__item-author"
                  onClick={() => { navigate(`/u/${n.author_username}`); onClose() }}
                >
                  <div className="note-modal__item-pfp">
                    {n.author_avatar
                      ? <img src={n.author_avatar} alt={n.author_username} />
                      : <span>{n.author_username[0].toUpperCase()}</span>
                    }
                  </div>
                  <span className="note-modal__item-username">{n.author_username}</span>
                </button>
                <p className="note-modal__item-content">{n.content}</p>
                <div className="note-modal__item-footer">
                  <span className="note-modal__item-time">{timeAgoShort(n.created_at)}</span>
                  <button className="note-modal__item-report" onClick={() => setReportingNote(n)}>
                    Report
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {reportingNote && (
        <ReportModal
          contentType="note"
          contentId={reportingNote.id}
          contentPreview={reportingNote.content}
          onClose={() => setReportingNote(null)}
        />
      )}
    </div>
  )
}

function GameAccountCard({ game, playerData, onClick, onRemove }) {
  const stats = getCardStats(game.id, game.uid, playerData)
  const thumb = game.bannerImage
    || (game.youtubeId ? `https://img.youtube.com/vi/${game.youtubeId}/mqdefault.jpg` : null)
    || game.posterImage || null
  return (
    <button
      className="ps-game-card ps-game-card--interactive"
      style={{ '--g1': game.color1, '--g2': game.color2 }}
      onClick={onClick}
    >
      <div className="ps-game-card__cover">
        {thumb && <img src={thumb} alt={game.name} loading="lazy" />}
        <button
          className="ps-game-card__remove"
          onClick={e => { e.stopPropagation(); onRemove() }}
          title="Remove"
        >✕</button>
      </div>
      <div className="ps-game-card__body">
        <p className="ps-game-card__name">{game.name}</p>
        <div className="ps-game-card__stats">
          {stats.map(({ label, value }) => (
            <span key={label} className="ps-game-card__stat">
              <span>{label}</span><span>{value}</span>
            </span>
          ))}
        </div>
        <span className="ps-game-card__cta">View Account →</span>
      </div>
    </button>
  )
}

function ShowcaseAgentCard({ agent, onClick }) {
  return (
    <button
      className="ps-char-card ga-showcase-card"
      style={{ '--accent': agent.elementColor }}
      onClick={onClick}
    >
      <div className="ps-char-card__portrait ga-showcase-card__portrait">
        {agent.portraitUrl
          ? <img src={agent.portraitUrl} alt={agent.displayName} loading="lazy" />
          : <div className="ps-char-card__fallback">{agent.displayName[0]}</div>
        }
        <span className="ga-showcase-card__rarity">{agent.rarity}</span>
        <span className="ga-showcase-card__lv">Lv.{agent.level}</span>
        {(agent.mindscapeLevel > 0 || agent.constellations > 0 || agent.eidolons > 0) && (
          <span className="ga-showcase-card__mindscape">
            {agent.mindscapeLevel > 0 ? `M${agent.mindscapeLevel}`
              : agent.eidolons > 0   ? `E${agent.eidolons}`
              : `C${agent.constellations}`}
          </span>
        )}
      </div>
      <p className="ps-char-card__name">{agent.displayName}</p>
      <p className="ga-showcase-card__element" style={{ color: agent.elementColor }}>
        {agent.element}
      </p>
    </button>
  )
}

function AgentDetailModal({ agent, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="agent-modal-overlay" onClick={onClose}>
      <div className="agent-modal" onClick={e => e.stopPropagation()}>
        <button className="agent-modal__close" onClick={onClose}>✕</button>

        {/* Portrait + identity */}
        <div className="agent-modal__header" style={{ '--accent': agent.elementColor }}>
          <div className="agent-modal__portrait">
            {(agent.portraitUrl || agent.iconUrl)
              ? <img src={agent.portraitUrl || agent.iconUrl} alt={agent.displayName} />
              : <div className="agent-modal__portrait-fallback">{agent.displayName[0]}</div>
            }
          </div>
          <div className="agent-modal__identity">
            <span className="agent-modal__rarity-badge">{agent.rarity}-Rank</span>
            <h2 className="agent-modal__name">{agent.displayName}</h2>
            <div className="agent-modal__tags">
              <span className="agent-modal__element" style={{ color: agent.elementColor }}>
                {agent.element}
              </span>
              {agent.profession && (<>
                <span className="agent-modal__tag-sep">·</span>
                <span className="agent-modal__profession">{agent.profession}</span>
              </>)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="agent-modal__stats">
          {[
            ['Level',           `Lv.${agent.level}`],
            ['Ascension',       `${agent.promotionLevel}/6`],
            agent.mindscapeLevel !== undefined && ['Mindscape',      `M${agent.mindscapeLevel}`],
            agent.coreSkillLevel !== undefined && ['Core Skill',     `${agent.coreSkillLevel}/6`],
            agent.constellations !== undefined && ['Constellations', `C${agent.constellations}`],
            agent.eidolons       !== undefined && ['Eidolons',       `E${agent.eidolons}`],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} className="agent-modal__stat">
              <span className="agent-modal__stat-value">{value}</span>
              <span className="agent-modal__stat-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Weapon */}
        {agent.weapon && (
          <div className="agent-modal__section">
            <h3 className="agent-modal__section-title">
              {agent.mindscapeLevel !== undefined ? 'W-Engine'
                : agent.eidolons !== undefined    ? 'Light Cone'
                : 'Weapon'}
            </h3>
            <div className="agent-modal__weapon">
              {agent.weapon.iconUrl && (
                <img
                  className="agent-modal__weapon-icon"
                  src={agent.weapon.iconUrl}
                  alt={agent.weapon.name}
                />
              )}
              <div className="agent-modal__weapon-info">
                <p className="agent-modal__weapon-name">{agent.weapon.name}</p>
                <p className="agent-modal__weapon-meta">
                  Lv.{agent.weapon.level}
                  <span className="agent-modal__weapon-sep" />
                  Refinement {agent.weapon.refinement}
                  <span className="agent-modal__weapon-sep" />
                  {agent.weapon.rarity}-Rank
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function GamePickerModal({ linkedGameIds, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const available    = GAMES.filter(g =>  ACCOUNT_FEATURE_GAMES.has(g.id))
  const maintenance  = GAMES.filter(g => !ACCOUNT_FEATURE_GAMES.has(g.id))

  const renderCard = (game) => {
    const enabled = ACCOUNT_FEATURE_GAMES.has(game.id)
    const linked  = linkedGameIds.has(game.id)
    const thumb   = game.youtubeId
      ? `https://img.youtube.com/vi/${game.youtubeId}/mqdefault.jpg`
      : game.posterImage || null
    return (
      <button
        key={game.id}
        className={`game-picker-card${!enabled ? ' game-picker-card--maintenance' : ''}${linked ? ' game-picker-card--linked' : ''}`}
        style={{ '--g1': game.color1, '--g2': game.color2 }}
        onClick={() => { if (enabled && !linked) onSelect(game) }}
        disabled={!enabled || linked}
      >
        <div className="game-picker-card__thumb">
          {thumb && <img src={thumb} alt={game.name} loading="lazy" />}
          {(!enabled || linked) && (
            <div className="game-picker-card__overlay">
              {!enabled && (
                <span className="game-picker-card__badge game-picker-card__badge--maintenance">
                  In Maintenance
                </span>
              )}
              {linked && enabled && (
                <span className="game-picker-card__badge game-picker-card__badge--linked">
                  Added
                </span>
              )}
            </div>
          )}
        </div>
        <p className="game-picker-card__name">{game.name}</p>
      </button>
    )
  }

  return (
    <div className="game-picker-overlay" onClick={onClose}>
      <div className="game-picker" onClick={e => e.stopPropagation()}>
        <div className="game-picker__header">
          <h3 className="game-picker__title">Select a Game</h3>
          <button className="game-picker__close" onClick={onClose}>✕</button>
        </div>
        <div className="game-picker__body">
          <div className="game-picker__grid">
            {available.map(renderCard)}
          </div>
          {maintenance.length > 0 && (
            <>
              <div className="game-picker__divider">
                <span>In Maintenance</span>
              </div>
              <div className="game-picker__grid">
                {maintenance.map(renderCard)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GameAccountView({ game, onBack }) {
  const viewCfg = GAME_VIEW_CONFIG[game.id] ?? DEFAULT_VIEW_CONFIG
  const { user, authFetch } = useAuth()

  const [uid,         setUid]         = useState('')
  const [playerData,  setPlayerData]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [changing,    setChanging]    = useState(false)
  const [activeAgent, setActiveAgent] = useState(null)
  const [fetchedAt,   setFetchedAt]   = useState(null)
  const [refreshing,  setRefreshing]  = useState(false)
  const [refreshMsg,  setRefreshMsg]  = useState(null)

  const applyAccount = (account) => {
    setPlayerData(account.snapshot)
    setFetchedAt(account.snapshot_fetched_at)
  }

  // Show the snapshot saved on the account; opening this view never calls Enka.
  useEffect(() => {
    if (!user?.id) return
    authFetch(`/api/users/${user.id}/game-accounts`)
      .then(r => r.json())
      .then(accounts => {
        const linked = Array.isArray(accounts) ? accounts.find(a => a.game_id === game.id) : null
        if (!linked) return
        if (linked.snapshot) applyAccount(linked)
        else setUid(linked.uid) // linked before snapshots existed: pressing Link loads it
      })
      .catch(() => {})
  }, [game.id])

  // Linking fetches the profile once on the server and saves it with the UID.
  const fetchPlayer = async (targetUid) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await authFetch(`/api/users/me/game-accounts/${game.id}`, {
        method: 'PUT',
        body: JSON.stringify({ uid: targetUid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to link account')
      if (!data.snapshot) throw new Error('Account linked, but stats are not available for this game yet.')
      applyAccount(data)
      setRefreshMsg(null)
      setChanging(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      const res  = await authFetch(`/api/users/me/game-accounts/${game.id}/refresh`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to refresh')
      applyAccount(data)
    } catch (err) {
      setRefreshMsg(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLink = (e) => {
    e.preventDefault()
    const trimmed = uid.trim()
    if (!trimmed) return
    fetchPlayer(trimmed)
  }

  const handleUnlink = async () => {
    try {
      await authFetch(`/api/users/me/game-accounts/${game.id}`, { method: 'DELETE' })
    } catch {}
    setPlayerData(null)
    setFetchedAt(null)
    setRefreshMsg(null)
    setUid('')
    setError(null)
    setChanging(false)
  }

  const showLinkForm = !playerData || changing
  const roster = playerData ? (playerData[viewCfg.rosterKey] ?? []) : []

  return (
    <div className="ga-view">
      <div className="ga-header" style={{ '--g1': game.color1, '--g2': game.color2 }}>
        <button className="ga-header__back" onClick={onBack}>← Profile</button>
        <div className="ga-header__info">
          <h2 className="ga-header__game-name">
            {playerData && !changing ? playerData.nickname : game.name}
          </h2>
          <span className="ga-header__status">
            {playerData && !changing ? viewCfg.headerStatus(playerData) : 'Account not linked'}
          </span>
        </div>
        {playerData?.bio && !changing && (
          <p className="ga-header__bio">{playerData.bio}</p>
        )}
      </div>

      {loading && <p className="ga-loading">Loading profile…</p>}

      {showLinkForm && !loading && (
        <form className="ga-uid-form" onSubmit={handleLink}>
          <div className="ga-uid-form__label">
            Link your {game.name} account by entering your UID.
          </div>
          <div className="ga-uid-form__row">
            <input
              className="ga-uid-input"
              type="text"
              placeholder="Your UID (e.g. 1000473389)"
              value={uid}
              onChange={e => setUid(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              autoFocus
            />
            <button className="ga-uid-submit" type="submit">Link</button>
            {changing && (
              <button className="ga-uid-cancel" type="button" onClick={() => setChanging(false)}>
                Cancel
              </button>
            )}
          </div>
          {error && <p className="ga-uid-error">{error}</p>}
        </form>
      )}

      {playerData && !changing && !loading && (
        <>
          <div className="ga-stats-row">
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.uid}</span>
              <span className="ga-stat__label">UID</span>
            </div>
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.region}</span>
              <span className="ga-stat__label">Server</span>
            </div>
            <div className="ga-stat">
              <span className="ga-stat__value">{playerData.level}</span>
              <span className="ga-stat__label">{viewCfg.levelLabel}</span>
            </div>
            <div className="ga-stat">
              <span className="ga-stat__value">{roster.length}</span>
              <span className="ga-stat__label">Characters Showcased</span>
            </div>
          </div>

          {viewCfg.extraStats && (() => {
            const extras = viewCfg.extraStats(playerData)
            return extras.length > 0 ? (
              <div className="ga-stats-row">
                {extras.map(({ label, value }) => (
                  <div key={label} className="ga-stat">
                    <span className="ga-stat__value">{value}</span>
                    <span className="ga-stat__label">{label}</span>
                  </div>
                ))}
              </div>
            ) : null
          })()}

          <div className="ga-sections">
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">{viewCfg.rosterLabel}</h2>
                <div className="ga-account-actions">
                  {fetchedAt && <span className="ga-updated">Updated {timeAgoShort(fetchedAt)}</span>}
                  <button className="ga-reload-btn" onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                  <button className="ga-reload-btn" onClick={() => { setUid(''); setChanging(true) }}>
                    Change UID
                  </button>
                  <button className="ga-reload-btn ga-reload-btn--unlink" onClick={handleUnlink}>
                    Unlink
                  </button>
                </div>
              </div>
              {refreshMsg && <p className="ga-uid-error">{refreshMsg}</p>}
              {roster.length > 0 ? (
                <div className="ga-agents-grid">
                  {roster.map(a => (
                    <ShowcaseAgentCard key={a.id} agent={a} onClick={() => setActiveAgent(a)} />
                  ))}
                </div>
              ) : (
                <p className="profile-empty">No characters in showcase — set one up in-game to display it here.</p>
              )}
            </section>
          </div>
        </>
      )}

      {activeAgent && (
        <AgentDetailModal agent={activeAgent} onClose={() => setActiveAgent(null)} />
      )}
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

function ArtworkCard({ art, onUnfav, onOpen }) {
  return (
    <div className="ps-artwork-card">
      <div className="ps-artwork-card__thumb" onClick={() => onOpen(art)}>
        {art.thumbnail_url
          ? <img src={art.thumbnail_url} alt={art.title} loading="lazy" />
          : <div className="ps-artwork-card__fallback" />
        }
      </div>
      <div className="ps-artwork-card__footer">
        <p className="ps-artwork-card__title">{art.title}</p>
        <button
          className="ps-artwork-card__unfav"
          onClick={() => onUnfav(art.id)}
          title="Remove from favorites"
        >♥</button>
      </div>
    </div>
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

function BoardUploadModal({ onAdd, onClose }) {
  const [gameId, setGameId] = useState(SHOWCASE_GAMES[0].id)
  const [imageBlob, setImageBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // Release the preview's object URL when it is replaced or the modal closes.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const { maxW, maxH } = IMAGE_SIZES.board
      const blob = await compressImage(file, maxW, maxH)
      setImageBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setError('That file could not be read as an image.')
    }
  }

  // The image is uploaded only on submit, so abandoning the modal leaves nothing behind.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageBlob || saving) return
    setSaving(true)
    setError('')
    try {
      const game = SHOWCASE_GAMES.find((g) => g.id === gameId)
      await onAdd({ gameId, gameName: game.name, imageBlob, caption: caption.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
      setSaving(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  return (
    <div className="board-modal-overlay" onClick={() => { if (!saving) onClose() }}>
      <div className="board-modal" onClick={(e) => e.stopPropagation()}>
        <button className="board-modal__close" onClick={onClose}>✕</button>
        <h3 className="board-modal__title">Add to Board</h3>
        <form onSubmit={handleSubmit}>
          <label className="board-modal__field-label">Game</label>
          <select
            className="board-modal__game-select"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            {SHOWCASE_GAMES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <div
            className="board-modal__upload"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl
              ? <img src={previewUrl} alt="preview" />
              : <span className="board-modal__upload-hint">Click to upload image</span>
            }
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>

          <textarea
            className="board-modal__caption"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
          />

          {error && <p className="board-modal__error">{error}</p>}

          <button className="board-modal__submit" type="submit" disabled={!imageBlob || saving}>
            {saving ? 'Uploading…' : 'Add to Board'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Drag-to-reorder ───────────────────────────────────────────────────────
// Returned handlers go on a draggable wrapper div around each card.
// onReorder updates state live; onSave persists once the drag ends.
function useDragReorder(list, onReorder, onSave) {
  const dragIdx = useRef(null)
  const listRef = useRef(list)
  listRef.current = list

  const onDragStart = (i) => (e) => {
    dragIdx.current = i
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (i) => (e) => {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    const next = [...listRef.current]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(i, 0, moved)
    dragIdx.current = i
    onReorder(next)
  }

  const onDragEnd = () => {
    onSave(listRef.current)
    dragIdx.current = null
  }

  return { onDragStart, onDragOver, onDragEnd }
}

export default function AccountPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, loadingAuth, refreshUser, authFetch } = useAuth()

  const [authModalOpen,  setAuthModalOpen]  = useState(false)
  const [followModal,    setFollowModal]    = useState(null)  // null | 'followers' | 'following'
  const [editingBio,     setEditingBio]     = useState(false)
  const [bioInput,       setBioInput]       = useState('')

  const [favVideos,      setFavVideos]      = useState([])
  const [favChars,       setFavChars]       = useState([])
  const [favArtworks,    setFavArtworks]    = useState([])
  const [followedGames,  setFollowedGames]  = useState([])
  const [boards,         setBoards]         = useState([])
  const [showBoardModal, setShowBoardModal] = useState(false)
  const [activeBoard,    setActiveBoard]    = useState(null)
  const [activeArtwork,  setActiveArtwork]  = useState(null)
  const [activeVideoId,    setActiveVideoId]    = useState(null)
  const [activeVideoTitle, setActiveVideoTitle] = useState('')
  const [selectedGame,    setSelectedGame]    = useState(null)
  const [showcaseGames,      setShowcaseGames]      = useState([])
  const [showcasePlayerData, setShowcasePlayerData] = useState({})
  const [showGamePicker,     setShowGamePicker]     = useState(false)

  const [notes,          setNotes]          = useState([])
  const [notesOpen,      setNotesOpen]      = useState(false)
  const [reviewsOpen,    setReviewsOpen]    = useState(false)
  const [reviewStats,    setReviewStats]    = useState(null)

  // Membership popup (#65). Stripe Checkout returns to /account?upgraded=1,
  // which opens it straight away to show the membership activating.
  const [searchParams, setSearchParams] = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === '1'
  const [membershipOpen, setMembershipOpen] = useState(justUpgraded)
  const closeMembership = () => {
    setMembershipOpen(false)
    if (justUpgraded) {
      searchParams.delete('upgraded')
      setSearchParams(searchParams, { replace: true })
    }
  }

  const [bannerSrc, setBannerSrc] = useState(null)
  const [pfpSrc,    setPfpSrc]    = useState(null)
  const bannerInputRef = useRef(null)
  const pfpInputRef    = useRef(null)

  useEffect(() => {
    setFavVideos(getFavVideos())
    setFavChars(getFavChars())
    setFavArtworks(getFavArtworks())
    setFollowedGames(getFollowedGames())
    // Use real avatar/banner from DB if logged in, otherwise fall back to localStorage
    setBannerSrc(user?.banner_url || getProfileBanner() || null)
    setPfpSrc(user?.avatar_url   || getProfilePfp()    || null)
  }, [user])

  // When logged in, fetch favorites from DB and merge with local ordering preference
  useEffect(() => {
    if (!user?.id) return
    const merge = (dbItems, localItems) => {
      // DB is the source of truth for order (sort_order column).
      // Append any local-only items that haven't synced to DB yet.
      if (dbItems.length === 0) return localItems
      const dbIds = new Set(dbItems.map(i => i.id))
      const localOnly = localItems.filter(i => !dbIds.has(i.id))
      return [...dbItems, ...localOnly]
    }
    ;(async () => {
      try {
        const [vidRes, charRes, artRes, gamesRes] = await Promise.all([
          authFetch('/api/videos/favorites'),
          authFetch('/api/characters/favorites'),
          authFetch('/api/artworks/favorites'),
          authFetch(`/api/users/${user.id}/games`),
        ])
        if (vidRes.ok) {
          const dbVideos = await vidRes.json()
          const merged = merge(dbVideos, getFavVideos())
          writeFavVideosLocal(merged)
          setFavVideos(merged)
        }
        if (charRes.ok) {
          const dbChars = await charRes.json()
          const merged = merge(dbChars, getFavChars())
          writeFavCharsLocal(merged)
          setFavChars(merged)
        }
        if (artRes.ok) {
          const dbArtworks = await artRes.json()
          const merged = merge(dbArtworks, getFavArtworks())
          writeFavArtworksLocal(merged)
          setFavArtworks(merged)
        }
        if (gamesRes.ok) {
          const dbGames = await gamesRes.json()
          const local = getFollowedGames()
          const localIds = new Set(local.map(g => g.id))
          const freshFromDb = dbGames
            .map(g => GAMES.find(lg => lg.id === g.slug))
            .filter(g => g && !localIds.has(g.id))
          if (freshFromDb.length > 0) {
            const merged = [...local, ...freshFromDb]
            saveFollowedGames(merged)
            setFollowedGames(merged)
          }
        }
      } catch {
        // Silently fall back to localStorage data already loaded above
      }
    })()
  }, [user?.id])

  // Load boards from server
  useEffect(() => {
    if (!user?.id) return
    authFetch(`/api/boards/user/${user.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]))
  }, [user?.id])

  // Load notes left on own profile
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/users/${user.id}/notes`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user?.id])

  // Load review stats (count + total upvotes received)
  useEffect(() => {
    if (!user?.id) return
    fetch(`${API}/reviews/user/${user.id}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setReviewStats(data) })
      .catch(() => {})
  }, [user?.id])

  // Load game account showcase. Stats come from the snapshot stored on each
  // linked account, so this never calls Enka.
  const refreshShowcase = () => {
    if (!user?.id) return
    authFetch(`/api/users/${user.id}/game-accounts`)
      .then(r => r.json())
      .then(accounts => {
        if (!Array.isArray(accounts)) return
        const games = accounts.map(a => { const g = GAMES.find(g => g.id === a.game_id); return g ? { ...g, uid: a.uid } : null }).filter(Boolean)
        setShowcaseGames(games)
        setShowcasePlayerData(Object.fromEntries(
          accounts
            .filter(a => a.snapshot && ACCOUNT_FEATURE_GAMES.has(a.game_id))
            .map(a => [a.game_id, a.snapshot])
        ))
      })
      .catch(() => {})
  }

  useEffect(refreshShowcase, [user?.id])

  const handleRemoveShowcaseGame = async (gameId) => {
    try {
      await authFetch(`/api/users/me/game-accounts/${gameId}`, { method: 'DELETE' })
    } catch {}
    refreshShowcase()
  }


  // Save bio edit
  const handleSaveBio = async () => {
    try {
      const res = await authFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio: bioInput }),
      })
      if (res.ok) {
        await refreshUser()
        setEditingBio(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Signed in: upload to Storage and save the URL. Guest: keep it in this browser only.
  const saveProfileImage = async (file, kind) => {
    const { maxW, maxH } = IMAGE_SIZES[kind]
    const blob = await compressImage(file, maxW, maxH)
    let src
    if (isLoggedIn) {
      src = await uploadImage(blob, kind)
      const res = await authFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ [kind === 'avatar' ? 'avatar_url' : 'banner_url']: src }),
      })
      if (!res.ok) throw new Error(`Saving ${kind} failed: ${res.status}`)
      refreshUser()
    } else {
      src = await blobToDataUrl(blob)
    }
    return src
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const src = await saveProfileImage(file, 'banner')
      setProfileBanner(src)
      setBannerSrc(src)
    } catch (err) { console.error('[Account] banner upload failed:', err) }
  }

  const handlePfpUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const src = await saveProfileImage(file, 'avatar')
      setProfilePfp(src)
      setPfpSrc(src)
    } catch (err) { console.error('[Account] avatar upload failed:', err) }
  }

  const resetBanner = async () => {
    clearProfileBanner()
    setBannerSrc(null)
    if (isLoggedIn) {
      await authFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify({ banner_url: null }) })
      refreshUser()
    }
  }

  const resetPfp = async () => {
    clearProfilePfp()
    setPfpSrc(null)
    if (isLoggedIn) {
      await authFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify({ avatar_url: null }) })
      refreshUser()
    }
  }

  const handleVideoClick = (video) => {
    if (activeVideoId === video.external_id) {
      setActiveVideoId(null)
      setActiveVideoTitle('')
    } else {
      setActiveVideoId(video.external_id)
      setActiveVideoTitle(video.title)
    }
  }

  // Throws on failure so the upload modal can show the error.
  const handleAddBoard = async (boardData) => {
    const imageUrl = await uploadImage(boardData.imageBlob, 'board')
    const res = await authFetch('/api/boards', {
      method: 'POST',
      body: JSON.stringify({
        game_id:   boardData.gameId,
        game_name: boardData.gameName,
        image_url: imageUrl,
        caption:   boardData.caption,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Could not save the board.')
    setBoards(prev => [...prev, data])
  }

  const handleDeleteBoard = async (id) => {
    try {
      await authFetch(`/api/boards/${id}`, { method: 'DELETE' })
      setBoards(prev => prev.filter(b => b.id !== id))
    } catch {}
  }

  const handleUnfavVideo = (id) => {
    toggleFavVideo({ id })
    setFavVideos(getFavVideos())
  }

  const handleUnfavChar = (id) => {
    toggleFavChar({ id })
    setFavChars(getFavChars())
  }

  const handleUnfavArtwork = (id) => {
    toggleFavArtwork({ id })
    setFavArtworks(getFavArtworks())
  }

  const handleCharClick = (char) => {
    const slug = char.game_slug
    if (!slug) return
    navigate(`/game/${slug}`, { state: { openTab: 'Characters', openCharId: char.id } })
  }

  // ── Derived lists & drag-reorder hooks ────────────────────────────────
  // Must be called before any early return to satisfy Rules of Hooks.
  const favRegular = favVideos.filter(v => v.category !== 'Music')
  const favBGM     = favVideos.filter(v => v.category === 'Music')

  const regularDrag = useDragReorder(
    favRegular,
    (next) => setFavVideos([...next, ...favBGM]),
    (next) => saveFavVideos([...next, ...favBGM]),
  )
  const bgmDrag = useDragReorder(
    favBGM,
    (next) => setFavVideos([...favRegular, ...next]),
    (next) => saveFavVideos([...favRegular, ...next]),
  )
  const artworksDrag = useDragReorder(
    favArtworks,
    (next) => setFavArtworks(next),
    (next) => saveFavArtworks(next),
  )

  if (loadingAuth) return (
    <div className="profile-page">
      <div className="profile-inner">
        <div className="profile-banner profile-banner--skeleton" />
        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-skeleton__card" />
          </aside>
          <main className="profile-main">
            <div className="profile-skeleton__section" />
            <div className="profile-skeleton__section profile-skeleton__section--short" />
          </main>
        </div>
      </div>
    </div>
  )

  return (
    <div className="profile-page">
      <div className="profile-inner">

        {/* Banner */}
        <div
          className="profile-banner"
          style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}
        >
          <div className="profile-banner__fade" />
          <div className="profile-banner__overlay">
            <button className="profile-banner__change" onClick={() => bannerInputRef.current?.click()}>
              Change Banner
            </button>
            {getProfileBanner() && (
              <button className="profile-banner__reset" onClick={resetBanner}>Reset</button>
            )}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBannerUpload}
          />
        </div>

        <div className="profile-layout">

          {/* ── Left sidebar ── */}
          <aside className="profile-sidebar">
            <h2 className="profile-sidebar__name">
              {isLoggedIn
                ? <><span style={{ fontSize: '1.35em', ...getRoleStyle(displayRole(user)) }}>{user.username}</span>'s Profile</>
                : 'Guest Profile'
              }
            </h2>

            <div className="profile-sidebar__card">
              <div className="profile-pfp" onClick={() => pfpInputRef.current?.click()}>
                {pfpSrc
                  ? <img src={pfpSrc} alt="Profile" className="profile-pfp__img" />
                  : (
                    <div className="profile-pfp__hint">
                      <span>+</span>
                      <span>Add Photo</span>
                    </div>
                  )
                }
                <div className="profile-pfp__overlay">
                  <span>Change Photo</span>
                  {getProfilePfp() && (
                    <button
                      className="profile-pfp__reset"
                      onClick={e => { e.stopPropagation(); resetPfp() }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  ref={pfpInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePfpUpload}
                />
              </div>

              {/* Bio */}
              {isLoggedIn && (
                <div className="profile-sidebar__bio-section">
                  {editingBio ? (
                    <>
                      <textarea
                        className="profile-sidebar__bio-input"
                        value={bioInput}
                        onChange={e => setBioInput(e.target.value)}
                        rows={3}
                        placeholder="Tell the world about yourself…"
                        maxLength={300}
                        autoFocus
                      />
                      <div className="profile-sidebar__bio-actions">
                        <button className="profile-sidebar__bio-save" onClick={handleSaveBio}>Save</button>
                        <button className="profile-sidebar__bio-cancel" onClick={() => setEditingBio(false)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="profile-sidebar__bio-display"
                      onClick={() => { setBioInput(user.bio || ''); setEditingBio(true) }}
                    >
                      {user.bio || <span className="profile-sidebar__bio-placeholder">Add a bio…</span>}
                    </button>
                  )}
                </div>
              )}

              {/* Following / Followers — click to open list modal */}
              <div className="profile-sidebar__social">
                <SocialStat
                  label="Followers"
                  value={user?.followers_count ?? 0}
                  onClick={() => setFollowModal('followers')}
                />
                <div className="profile-sidebar__social-divider" />
                <SocialStat
                  label="Following"
                  value={user?.following_count ?? 0}
                  onClick={() => setFollowModal('following')}
                />
              </div>

              {/* Login CTA for guests */}
              {!isLoggedIn && !loadingAuth && (
                <button className="profile-sidebar__login-cta" onClick={() => setAuthModalOpen(true)}>
                  Log in to save your profile
                </button>
              )}

              <div className="profile-sidebar__info">
                <InfoRow label="Birthday" value={
                  user?.birthday
                    ? new Date(user.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    : '—'
                } />
                <InfoRow label="Joined" value={
                  user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—'
                } />
              </div>

            </div>

            {/* Membership + My Reviews + View Notes buttons — outside the card */}
            {isLoggedIn && (
              <>
                {/* Hidden for staff/VIP/Member roles, who have membership without paying */}
                {hasPaymentProblem(user) ? (
                  <button className="up-note-btn up-note-btn--warn" onClick={() => setMembershipOpen(true)}>
                    ⚠ Membership: payment failed
                  </button>
                ) : hasActiveSubscription(user) ? (
                  <button className="up-note-btn up-note-btn--member" onClick={() => setMembershipOpen(true)}>
                    ✦ Membership
                  </button>
                ) : !isMember(user) && (
                  <button className="up-note-btn up-note-btn--member" onClick={() => setMembershipOpen(true)}>
                    ✦ Become a Member
                  </button>
                )}
                <button className="up-note-btn" onClick={() => setReviewsOpen(true)}>
                  ★ My Reviews
                  {reviewStats?.total_upvotes > 0 && (
                    <span className="up-note-btn__badge">▲ {reviewStats.total_upvotes}</span>
                  )}
                </button>
                <button className="up-note-btn" onClick={() => setNotesOpen(true)}>
                  ✉ View Notes{notes.length > 0 ? ` · ${notes.length}` : ''}
                </button>
                <SharePopover
                  url={`${window.location.origin}/u/${user.username}`}
                  tweetText={`Check out ${user.username}'s profile on GachaVerse!`}
                  label="Share Profile"
                  className="up-share-btn"
                />
              </>
            )}

          </aside>

          {/* ── Right main ── */}
          <main className="profile-main">

            {selectedGame ? (
              <GameAccountView
                game={selectedGame}
                onBack={() => { setSelectedGame(null); refreshShowcase() }}
              />
            ) : (
              <>
                {/* Badges — the user's role (unless Regular) and, for paying
                    subscribers without the Member role, a Member badge (#65) */}
                {isLoggedIn && (() => {
                  const badges = profileBadges(user)
                  return badges.length > 0 && (
                    <section className="profile-section">
                      <div className="profile-section__header">
                        <h2 className="profile-section__title">Badges</h2>
                      </div>
                      <div className="profile-badges">
                        {badges.map(badge => (
                          <span
                            key={badge}
                            className="profile-badge"
                            style={{
                              '--badge-color': getRoleStyle(badge).color,
                              '--badge-glow':  getRoleGlow(badge) ?? 'transparent',
                            }}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </section>
                  )
                })()}

                {/* Board */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Board</h2>
                    <span className="profile-section__count">{boards.length}/10</span>
                  </div>
                  {boards.length > 0 ? (
                    <div className="profile-board-grid">
                      {boards.map((b) => (
                        <div
                          key={b.id}
                          className="profile-board-card"
                          onClick={() => setActiveBoard(b)}
                        >
                          <img src={b.image_url} alt={b.caption || b.game_name} loading="lazy" />
                          <div className="profile-board-card__overlay">
                            <span className="profile-board-card__game">{b.game_name}</span>
                            <button
                              className="profile-board-card__delete"
                              onClick={(e) => { e.stopPropagation(); handleDeleteBoard(b.id) }}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                      {boards.length < 10 && (
                        <button
                          className="profile-board-add"
                          onClick={() => setShowBoardModal(true)}
                        >+</button>
                      )}
                    </div>
                  ) : (
                    <div className="profile-board-empty">
                      <button
                        className="profile-board-add profile-board-add--hero"
                        onClick={() => setShowBoardModal(true)}
                      >
                        <span>+</span>
                        <span>Add your first board</span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Game Account Showcase */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Game Account Showcase</h2>
                  </div>
                  {showcaseGames.length > 0 ? (
                    <div className="profile-hscroll">
                      {showcaseGames.map((g) => (
                        <GameAccountCard
                          key={g.id}
                          game={g}
                          playerData={showcasePlayerData[g.id]}
                          onClick={() => setSelectedGame(g)}
                          onRemove={() => handleRemoveShowcaseGame(g.id)}
                        />
                      ))}
                      {showcaseGames.length < 9 && (
                        <button className="ga-showcase-add-btn" onClick={() => setShowGamePicker(true)}>
                          + Add
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="ga-showcase-empty">
                      <p className="ga-showcase-empty__text">No game accounts linked yet.</p>
                      <button className="ga-showcase-add-hero" onClick={() => setShowGamePicker(true)}>
                        + Add your game's account
                      </button>
                    </div>
                  )}
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
                    <span className="profile-section__count">{favRegular.length}/9</span>
                  </div>
                  {favRegular.length > 0 ? (
                    <>
                      <div className="profile-hscroll">
                        {favRegular.map((v, i) => (
                          <div
                            key={v.id ?? i}
                            className="fav-drag-item"
                            draggable
                            onDragStart={regularDrag.onDragStart(i)}
                            onDragOver={regularDrag.onDragOver(i)}
                            onDragEnd={regularDrag.onDragEnd}
                          >
                            <VideoCard
                              video={v}
                              isActive={activeVideoId === v.external_id}
                              onClick={() => handleVideoClick(v)}
                            />
                            <button
                              className="fav-item__unfav"
                              onClick={(e) => { e.stopPropagation(); handleUnfavVideo(v.id) }}
                              title="Remove from favorites"
                            >♥</button>
                          </div>
                        ))}
                      </div>
                      {favRegular.some(v => v.external_id === activeVideoId) && (
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

                {/* Favorite BGM */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Favorite BGM</h2>
                    <span className="profile-section__count">{favBGM.length}/9</span>
                  </div>
                  {favBGM.length > 0 ? (
                    <>
                      <div className="profile-hscroll">
                        {favBGM.map((v, i) => (
                          <div
                            key={v.id ?? i}
                            className="fav-drag-item"
                            draggable
                            onDragStart={bgmDrag.onDragStart(i)}
                            onDragOver={bgmDrag.onDragOver(i)}
                            onDragEnd={bgmDrag.onDragEnd}
                          >
                            <VideoCard
                              video={v}
                              isActive={activeVideoId === v.external_id}
                              onClick={() => handleVideoClick(v)}
                            />
                            <button
                              className="fav-item__unfav"
                              onClick={(e) => { e.stopPropagation(); handleUnfavVideo(v.id) }}
                              title="Remove from favorites"
                            >♥</button>
                          </div>
                        ))}
                      </div>
                      {favBGM.some(v => v.external_id === activeVideoId) && (
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
                    <p className="profile-empty">No favorited BGM yet — heart a track from the Music section on any game page.</p>
                  )}
                </section>

                {/* Favorite Characters */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Favorite Characters</h2>
                    <span className="profile-section__count">{favChars.length}/9</span>
                  </div>
                  {favChars.length > 0 ? (
                    <div className="profile-char-grid">
                      {favChars.map((c, i) => (
                        <div key={c.id ?? i} className="fav-item">
                          <CharCard char={c} onClick={() => handleCharClick(c)} />
                          <button
                            className="fav-item__unfav"
                            onClick={(e) => { e.stopPropagation(); handleUnfavChar(c.id) }}
                            title="Remove from favorites"
                          >♥</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">No favorited characters yet — heart a character to add them here.</p>
                  )}
                </section>

                {/* Favorite Artworks */}
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Favorite Artworks</h2>
                    <span className="profile-section__count">{favArtworks.length}/9</span>
                  </div>
                  {favArtworks.length > 0 ? (
                    <div className="profile-artwork-grid">
                      {favArtworks.map((a, i) => (
                        <div
                          key={a.id ?? i}
                          className="fav-drag-item"
                          draggable
                          onDragStart={artworksDrag.onDragStart(i)}
                          onDragOver={artworksDrag.onDragOver(i)}
                          onDragEnd={artworksDrag.onDragEnd}
                        >
                          <ArtworkCard
                            art={a}
                            onUnfav={handleUnfavArtwork}
                            onOpen={setActiveArtwork}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">No favorited artworks yet — heart an artwork on any game's Official Artworks tab.</p>
                  )}
                </section>
              </>
            )}

          </main>
        </div>
      </div>

      {showBoardModal && (
        <BoardUploadModal
          onAdd={handleAddBoard}
          onClose={() => setShowBoardModal(false)}
        />
      )}
      {activeBoard && (
        <BoardLightbox
          board={activeBoard}
          boardOwner={user ? { id: user.id, username: user.username, avatar_url: user.avatar_url, role: displayRole(user) } : null}
          onClose={() => setActiveBoard(null)}
        />
      )}
      {activeArtwork && (
        <ImageLightbox
          src={activeArtwork.source_url || activeArtwork.thumbnail_url}
          title={activeArtwork.title}
          sourceUrl={activeArtwork.source_url}
          onClose={() => setActiveArtwork(null)}
        />
      )}
      {showGamePicker && (
        <GamePickerModal
          linkedGameIds={new Set(showcaseGames.map(g => g.id))}
          onSelect={(game) => { setShowGamePicker(false); setSelectedGame(game) }}
          onClose={() => setShowGamePicker(false)}
        />
      )}
      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}
      {followModal && (
        <FollowListModal
          userId={user?.id}
          tab={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}
      {membershipOpen && isLoggedIn && (
        <MembershipModal justUpgraded={justUpgraded} onClose={closeMembership} />
      )}
      {notesOpen && (
        <ViewNotesModal
          notes={notes}
          onClose={() => setNotesOpen(false)}
        />
      )}
      {reviewsOpen && user && (
        <MyReviewsModal
          userId={user.id}
          authFetch={authFetch}
          onClose={() => setReviewsOpen(false)}
          onStatsChange={setReviewStats}
        />
      )}
    </div>
  )
}
