import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleStyle, getRoleGlow } from '../utils/roles'
import { GAMES } from '../data/games'
import AuthModal from '../components/ui/AuthModal'
import BoardLightbox from '../components/ui/BoardLightbox'
import YouTubeEmbed  from '../components/ui/YouTubeEmbed'
import ImageLightbox from '../components/ui/ImageLightbox'
import GameCard from '../components/GameCard'
import './AccountPage.css'
import './UserProfilePage.css'

const API = import.meta.env.VITE_API_URL || '/api'

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


/* ── Reusable sub-components ─────────────────────────────────────── */

function SocialStat({ label, value, onClick }) {
  return (
    <button className="ps-social-stat" onClick={onClick}>
      <span className="ps-social-stat__value">{value}</span>
      <span className="ps-social-stat__label">{label}</span>
    </button>
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

function FollowListModal({ userId, tab: initialTab, onClose }) {
  const [tab,       setTab]       = useState(initialTab)
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
            <button className={`follow-modal__tab${tab === 'followers' ? ' follow-modal__tab--active' : ''}`} onClick={() => setTab('followers')}>Followers</button>
            <button className={`follow-modal__tab${tab === 'following' ? ' follow-modal__tab--active' : ''}`} onClick={() => setTab('following')}>Following</button>
          </div>
          <button className="follow-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="follow-modal__list">
          {list === null ? (
            <p className="follow-modal__empty">Loading…</p>
          ) : list.length === 0 ? (
            <p className="follow-modal__empty">{tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
          ) : list.map(u => (
            <div key={u.id} className="follow-modal__item">
              <div className="follow-modal__pfp">
                {u.avatar_url ? <img src={u.avatar_url} alt={u.username} /> : <span>{u.username[0].toUpperCase()}</span>}
              </div>
              <span className="follow-modal__username">{u.username}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Note write/edit modal (shown on other user's profile) ───────── */

const MAX_NOTE = 50

function LeaveNoteModal({ targetId, existingNote, onSaved, onDeleted, onClose, authFetch }) {
  const [text,    setText]    = useState(existingNote?.content ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true); setError(null)
    try {
      const res  = await authFetch(`${API}/users/${targetId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save note.')
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingNote) return
    setSaving(true); setError(null)
    try {
      const res = await authFetch(`${API}/users/${targetId}/notes/${existingNote.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete note.')
      onDeleted()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="note-modal-overlay" onClick={onClose}>
      <div className="note-modal" onClick={e => e.stopPropagation()}>
        <div className="note-modal__header">
          <span className="note-modal__title">{existingNote ? 'Edit Note' : 'Leave a Note'}</span>
          <button className="note-modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            className="note-modal__textarea"
            placeholder="Write something short…"
            maxLength={MAX_NOTE}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <div className="note-modal__footer">
            <span className="note-modal__count">{text.length}/{MAX_NOTE}</span>
            <div className="note-modal__actions">
              {existingNote && (
                <button type="button" className="note-modal__delete" onClick={handleDelete} disabled={saving}>
                  Delete
                </button>
              )}
              <button type="submit" className="note-modal__submit" disabled={saving || !text.trim()}>
                {saving ? 'Saving…' : existingNote ? 'Update' : 'Post'}
              </button>
            </div>
          </div>
          {error && <p className="note-modal__error">{error}</p>}
        </form>
      </div>
    </div>
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
      <p className="ga-showcase-card__element" style={{ color: agent.elementColor }}>{agent.element}</p>
    </button>
  )
}

function AgentDetailModal({ agent, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="agent-modal-overlay" onClick={onClose}>
      <div className="agent-modal" onClick={e => e.stopPropagation()}>
        <button className="agent-modal__close" onClick={onClose}>✕</button>
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
              <span className="agent-modal__element" style={{ color: agent.elementColor }}>{agent.element}</span>
              {agent.profession && (<>
                <span className="agent-modal__tag-sep">·</span>
                <span className="agent-modal__profession">{agent.profession}</span>
              </>)}
            </div>
          </div>
        </div>
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
        {agent.weapon && (
          <div className="agent-modal__section">
            <h3 className="agent-modal__section-title">
              {agent.mindscapeLevel !== undefined ? 'W-Engine'
                : agent.eidolons !== undefined    ? 'Light Cone'
                : 'Weapon'}
            </h3>
            <div className="agent-modal__weapon">
              {agent.weapon.iconUrl && (
                <img className="agent-modal__weapon-icon" src={agent.weapon.iconUrl} alt={agent.weapon.name} />
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

function PublicGameAccountView({ game, profileUsername, onBack }) {
  const viewCfg = GAME_VIEW_CONFIG[game.id] ?? DEFAULT_VIEW_CONFIG
  const [playerData,  setPlayerData]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [activeAgent, setActiveAgent] = useState(null)

  useEffect(() => {
    fetch(`/api/games/${game.id}/player/${game.uid}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.message || 'Failed to load profile')
        return data
      })
      .then(data => { setPlayerData(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [game.id, game.uid])

  const roster = playerData ? (playerData[viewCfg.rosterKey] ?? []) : []

  return (
    <div className="ga-view">
      <div className="ga-header" style={{ '--g1': game.color1, '--g2': game.color2 }}>
        <button className="ga-header__back" onClick={onBack}>← {profileUsername}'s Profile</button>
        <div className="ga-header__info">
          <h2 className="ga-header__game-name">
            {playerData ? playerData.nickname : game.name}
          </h2>
          <span className="ga-header__status">
            {playerData ? viewCfg.headerStatus(playerData) : loading ? 'Loading…' : 'Account not linked'}
          </span>
        </div>
        {playerData?.bio && <p className="ga-header__bio">{playerData.bio}</p>}
      </div>

      {loading && <p className="ga-loading">Loading profile…</p>}
      {error   && <p className="ga-loading" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}

      {playerData && (
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
              </div>
              {roster.length > 0 ? (
                <div className="ga-agents-grid">
                  {roster.map(a => (
                    <ShowcaseAgentCard key={a.id} agent={a} onClick={() => setActiveAgent(a)} />
                  ))}
                </div>
              ) : (
                <p className="profile-empty">No characters in showcase — the player hasn't set one up in-game yet.</p>
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

/* ── Main page ───────────────────────────────────────────────────── */

export default function UserProfilePage() {
  const { username } = useParams()
  const navigate     = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: me, isLoggedIn, loadingAuth, authFetch, refreshUser } = useAuth()

  const [profile,      setProfile]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [following,    setFollowing]    = useState(false)
  const [followCounts, setFollowCounts] = useState({ followers_count: 0, following_count: 0 })
  const [followModal,  setFollowModal]  = useState(null)
  const [authOpen,     setAuthOpen]     = useState(false)
  const [boards,        setBoards]        = useState([])
  const [activeBoard,   setActiveBoard]   = useState(null)
  const [gameAccounts,    setGameAccounts]    = useState([])
  const [linkedPlayerData, setLinkedPlayerData] = useState({})
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [followedGames, setFollowedGames] = useState([])
  const [favVideos,     setFavVideos]     = useState([])
  const [favChars,      setFavChars]      = useState([])
  const [favArtworks,   setFavArtworks]   = useState([])
  const [activeArtwork,   setActiveArtwork]   = useState(null)
  const [activeVideoId,   setActiveVideoId]   = useState(null)
  const [activeVideoTitle, setActiveVideoTitle] = useState('')
  const [myNote,        setMyNote]        = useState(undefined) // undefined = not fetched yet
  const [noteOpen,      setNoteOpen]      = useState(false)
  const [roleAssigning, setRoleAssigning] = useState(false)

  const canAssignRoles = me?.role === 'Owner' || me?.role === 'Dev'
  const assignableRoles = me?.role === 'Owner'
    ? ['Owner', 'Dev', 'VIP', 'Member', 'Regular', 'Debug']
    : ['VIP', 'Member', 'Regular', 'Debug']

  const handleAssignRole = async (role) => {
    if (!profile) return
    setRoleAssigning(true)
    try {
      const res = await authFetch(`${API}/users/${profile.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile(prev => ({ ...prev, role: updated.role }))
      }
    } finally {
      setRoleAssigning(false)
    }
  }

  /* Scroll to top on every profile visit */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [username])

  /* Redirect to /account if it's the logged-in user's own profile */
  useEffect(() => {
    if (!loadingAuth && me && profile && me.id === profile.id) {
      navigate('/account', { replace: true })
    }
  }, [loadingAuth, me?.id, profile?.id])

  /* Fetch profile — use authFetch when logged in so Owner/Dev can see Debug profiles */
  useEffect(() => {
    if (loadingAuth) return
    setLoading(true)
    setNotFound(false)
    const fetchFn = isLoggedIn ? authFetch : fetch
    fetchFn(`${API}/users/by-username/${encodeURIComponent(username)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        setProfile(data)
        setFollowCounts({ followers_count: data.followers_count, following_count: data.following_count })
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [username, loadingAuth, isLoggedIn])

  /* Fetch boards + linked game accounts + public favorites when profile loads */
  useEffect(() => {
    if (!profile?.id) return
    const get = (url, setter) =>
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(); return r.json() })
        .then(data => setter(Array.isArray(data) ? data : []))
        .catch(() => setter([]))

    get(`${API}/boards/user/${profile.id}`, (data) => {
      setBoards(data)
      const boardId = new URLSearchParams(window.location.search).get('board')
      if (boardId) {
        const target = data.find(b => b.id === boardId)
        if (target) setActiveBoard(target)
      }
    })
    get(`${API}/users/${profile.id}/game-accounts`,      setGameAccounts)
    get(`${API}/users/${profile.id}/games`,              setFollowedGames)
    get(`${API}/users/${profile.id}/favorites/videos`,   setFavVideos)
    get(`${API}/users/${profile.id}/favorites/characters`, setFavChars)
    get(`${API}/users/${profile.id}/favorites/artworks`, setFavArtworks)
  }, [profile?.id])

  /* Fetch player data for each linked account to populate showcase cards */
  useEffect(() => {
    if (gameAccounts.length === 0) return
    gameAccounts.forEach(a => {
      if (!a.uid) return
      fetch(`/api/games/${a.game_id}/player/${a.uid}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setLinkedPlayerData(prev => ({ ...prev, [a.game_id]: data })) })
        .catch(() => {})
    })
  }, [gameAccounts])

  /* Check follow status once profile + auth are both ready */
  useEffect(() => {
    if (!profile || !isLoggedIn || (me && profile && me.id === profile.id)) return
    authFetch(`${API}/users/${profile.id}/follow-status`)
      .then(r => r.json())
      .then(d => {
        setFollowing(d.following)
        setFollowCounts({ followers_count: d.followers_count, following_count: d.following_count })
      })
      .catch(() => {})
  }, [profile?.id, isLoggedIn])

  /* Fetch viewer's existing note on this profile */
  useEffect(() => {
    if (!profile?.id || !isLoggedIn) return
    authFetch(`${API}/users/${profile.id}/notes/mine`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setMyNote(data ?? null))
      .catch(() => setMyNote(null))
  }, [profile?.id, isLoggedIn])

  const handleFollow = async () => {
    if (!isLoggedIn) { setAuthOpen(true); return }
    const method = following ? 'DELETE' : 'POST'
    const res  = await authFetch(`${API}/users/${profile.id}/follow`, { method })
    const data = await res.json()
    setFollowing(data.following)
    setFollowCounts({ followers_count: data.followers_count, following_count: data.following_count })
    refreshUser()
  }

  /* ── Guard states ── */
  if (loading || loadingAuth) {
    return <div className="profile-page"><div className="up-loading">Loading…</div></div>
  }
  if (notFound) {
    return (
      <div className="profile-page">
        <div className="up-not-found">
          <p>User <strong>@{username}</strong> not found.</p>
          <button onClick={() => navigate('/')}>Go home</button>
        </div>
      </div>
    )
  }
  /* While redirect is in-flight for own profile */
  if (me && profile && me.id === profile.id) return null

  /* ── Render ── */
  return (
    <div className="profile-page">
      <div className="profile-inner">

        {/* ── Banner — read-only ── */}
        <div
          className="profile-banner"
          style={{
            cursor: 'default',
            ...(profile.banner_url ? { backgroundImage: `url(${profile.banner_url})` } : {}),
          }}
        >
          <div className="profile-banner__fade" />
          {/* No edit overlay */}
        </div>

        <div className="profile-layout">

          {/* ── Sidebar ── */}
          <aside className="profile-sidebar">
            <h2 className="profile-sidebar__name">
              <span style={{ fontSize: '1.35em', ...getRoleStyle(profile.role) }}>{profile.username}</span>'s Profile
            </h2>

            <div className="profile-sidebar__card">

              {/* Portrait — read-only */}
              <div className="profile-pfp" style={{ cursor: 'default' }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.username} className="profile-pfp__img" />
                  : (
                    <div className="profile-pfp__hint" style={{ pointerEvents: 'none' }}>
                      <span style={{ fontSize: '3.5rem', color: 'rgba(255,255,255,0.06)' }}>👤</span>
                    </div>
                  )
                }
                {/* No overlay */}
              </div>

              {/* Bio — read-only */}
              {profile.bio && (
                <div className="profile-sidebar__bio-section" style={{ padding: '0.6rem 0.85rem 0' }}>
                  <p className="up-bio" style={{ margin: 0, textAlign: 'left', padding: 0 }}>
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Follow + Share */}
              <div className="up-profile-actions">
                <button
                  className={`up-follow-btn${following ? ' up-follow-btn--following' : ''}`}
                  onClick={handleFollow}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              </div>

              {/* Social stats */}
              <div className="profile-sidebar__social">
                <SocialStat
                  label="Followers"
                  value={Number(followCounts.followers_count).toLocaleString()}
                  onClick={() => setFollowModal('followers')}
                />
                <div className="profile-sidebar__social-divider" />
                <SocialStat
                  label="Following"
                  value={Number(followCounts.following_count).toLocaleString()}
                  onClick={() => setFollowModal('following')}
                />
              </div>

              {/* Meta info */}
              <div className="profile-sidebar__info">
                {profile.birthday && (
                  <InfoRow
                    label="Birthday"
                    value={new Date(profile.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  />
                )}
                <InfoRow
                  label="Joined"
                  value={new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                />
              </div>

            </div>

            {/* Leave / Edit Note button — outside the card */}
            {isLoggedIn && (
              <button
                className={`up-note-btn${myNote ? ' up-note-btn--edit' : ''}`}
                onClick={() => setNoteOpen(true)}
              >
                {myNote ? '✎ Edit Note' : '✎ Leave Note'}
              </button>
            )}

          </aside>

          {/* ── Main content ── */}
          <main className="profile-main">
            {selectedAccount && (
              <PublicGameAccountView
                game={selectedAccount}
                profileUsername={profile.username}
                onBack={() => setSelectedAccount(null)}
              />
            )}

            {!selectedAccount && (<>
            {/* Badges — only shown for non-Regular roles, or always shown to Owner/Dev for assignment */}
            {(profile.role !== 'Regular' || canAssignRoles) && (
              <section className="profile-section">
                <div className="profile-section__header">
                  <h2 className="profile-section__title">Badges</h2>
                  {canAssignRoles && (
                    <select
                      className="role-assign-select"
                      value={profile.role}
                      disabled={roleAssigning}
                      onChange={(e) => handleAssignRole(e.target.value)}
                    >
                      {assignableRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>
                {profile.role !== 'Regular' && (
                  <div className="profile-badges">
                    <span
                      className="profile-badge"
                      style={{
                        '--badge-color': getRoleStyle(profile.role).color,
                        '--badge-glow':  getRoleGlow(profile.role) ?? 'transparent',
                      }}
                    >
                      {profile.role}
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* Board — read-only */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Board</h2>
                {boards.length > 0 && (
                  <span className="profile-section__count">{boards.length}/10</span>
                )}
              </div>
              {boards.length > 0 ? (
                <div className="profile-board-grid">
                  {boards.map(b => (
                    <div
                      key={b.id}
                      className="profile-board-card"
                      onClick={() => { setActiveBoard(b); setSearchParams({ board: b.id }) }}
                    >
                      <img src={b.image_url} alt={b.caption || b.game_name} loading="lazy" />
                      <div className="profile-board-card__overlay">
                        <span className="profile-board-card__game">{b.game_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">Nothing on the board yet.</p>
              )}
            </section>

            {/* Game Account Showcase */}
            {(() => {
              const linkedGames = gameAccounts
                .map(a => { const g = GAMES.find(g => g.id === a.game_id); return g ? { ...g, uid: a.uid } : null })
                .filter(Boolean)
              if (linkedGames.length === 0) return null
              return (
                <section className="profile-section">
                  <div className="profile-section__header">
                    <h2 className="profile-section__title">Game Account Showcase</h2>
                  </div>
                  <div className="profile-hscroll">
                    {linkedGames.map(g => {
                      const thumb = g.bannerImage
                        || (g.youtubeId ? `https://img.youtube.com/vi/${g.youtubeId}/mqdefault.jpg` : null)
                        || g.posterImage || null
                      return (
                      <button
                        key={g.id}
                        className="ps-game-card ps-game-card--interactive"
                        style={{ '--g1': g.color1, '--g2': g.color2 }}
                        onClick={() => setSelectedAccount(g)}
                      >
                        <div className="ps-game-card__cover">
                          {thumb && <img src={thumb} alt={g.name} loading="lazy" />}
                        </div>
                        <div className="ps-game-card__body">
                          <p className="ps-game-card__name">{g.name}</p>
                          <div className="ps-game-card__stats">
                            {getCardStats(g.id, g.uid, linkedPlayerData[g.id]).map(({ label, value }) => (
                              <span key={label} className="ps-game-card__stat">
                                <span>{label}</span><span>{value}</span>
                              </span>
                            ))}
                          </div>
                          <span className="ps-game-card__cta">View Account →</span>
                        </div>
                      </button>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* Followed Games */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Followed Games</h2>
              </div>
              {followedGames.length > 0 ? (
                <div className="profile-hscroll">
                  {followedGames
                    .map(g => GAMES.find(lg => lg.id === g.slug))
                    .filter(Boolean)
                    .map(g => <GameCard key={g.id} game={g} />)
                  }
                </div>
              ) : (
                <p className="profile-empty">No followed games yet.</p>
              )}
            </section>

            {/* Favorite Videos */}
            {(() => {
              const regular = favVideos.filter(v => v.category !== 'Music')
              const bgm     = favVideos.filter(v => v.category === 'Music')
              return (
                <>
                  <section className="profile-section">
                    <div className="profile-section__header">
                      <h2 className="profile-section__title">Favorite Videos</h2>
                      {regular.length > 0 && <span className="profile-section__count">{regular.length}</span>}
                    </div>
                    {regular.length > 0 ? (
                      <>
                        <div className="profile-hscroll">
                          {regular.map(v => (
                            <button
                              key={v.id}
                              className={`ps-video-card${activeVideoId === v.external_id && regular.some(r => r.external_id === activeVideoId) ? ' ps-video-card--active' : ''}`}
                              onClick={() => {
                                if (activeVideoId === v.external_id) { setActiveVideoId(null); setActiveVideoTitle('') }
                                else { setActiveVideoId(v.external_id); setActiveVideoTitle(v.title) }
                              }}
                            >
                              <div className="ps-video-card__thumb">
                                {v.thumbnail_url
                                  ? <img src={v.thumbnail_url} alt={v.title} loading="lazy" />
                                  : <div className="ps-video-card__thumb-fallback" />
                                }
                                <div className="ps-video-card__play">▶</div>
                              </div>
                              <p className="ps-video-card__title">{v.title}</p>
                            </button>
                          ))}
                        </div>
                        {regular.some(v => v.external_id === activeVideoId) && (
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
                      <p className="profile-empty">No favorited videos yet.</p>
                    )}
                  </section>

                  <section className="profile-section">
                    <div className="profile-section__header">
                      <h2 className="profile-section__title">Favorite BGM</h2>
                      {bgm.length > 0 && <span className="profile-section__count">{bgm.length}</span>}
                    </div>
                    {bgm.length > 0 ? (
                      <>
                        <div className="profile-hscroll">
                          {bgm.map(v => (
                            <button
                              key={v.id}
                              className={`ps-video-card${activeVideoId === v.external_id && bgm.some(b => b.external_id === activeVideoId) ? ' ps-video-card--active' : ''}`}
                              onClick={() => {
                                if (activeVideoId === v.external_id) { setActiveVideoId(null); setActiveVideoTitle('') }
                                else { setActiveVideoId(v.external_id); setActiveVideoTitle(v.title) }
                              }}
                            >
                              <div className="ps-video-card__thumb">
                                {v.thumbnail_url
                                  ? <img src={v.thumbnail_url} alt={v.title} loading="lazy" />
                                  : <div className="ps-video-card__thumb-fallback" />
                                }
                                <div className="ps-video-card__play">▶</div>
                              </div>
                              <p className="ps-video-card__title">{v.title}</p>
                            </button>
                          ))}
                        </div>
                        {bgm.some(v => v.external_id === activeVideoId) && (
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
                      <p className="profile-empty">No favorited BGM yet.</p>
                    )}
                  </section>
                </>
              )
            })()}

            {/* Favorite Characters */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Characters</h2>
                {favChars.length > 0 && <span className="profile-section__count">{favChars.length}</span>}
              </div>
              {favChars.length > 0 ? (
                <div className="profile-char-grid">
                  {favChars.map(c => (
                    <div key={c.id} className="ps-char-card">
                      <div className="ps-char-card__portrait">
                        {c.icon_url
                          ? <img src={c.icon_url} alt={c.display_name || c.name} loading="lazy" />
                          : <div className="ps-char-card__fallback">{(c.display_name || c.name)[0]}</div>
                        }
                      </div>
                      <p className="ps-char-card__name">{c.display_name || c.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">No favorited characters yet.</p>
              )}
            </section>

            {/* Favorite Artworks */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Artworks</h2>
                {favArtworks.length > 0 && <span className="profile-section__count">{favArtworks.length}</span>}
              </div>
              {favArtworks.length > 0 ? (
                <div className="profile-artwork-grid">
                  {favArtworks.map(a => (
                    <div key={a.id} className="ps-artwork-card">
                      <div className="ps-artwork-card__thumb" onClick={() => setActiveArtwork(a)}>
                        {a.thumbnail_url
                          ? <img src={a.thumbnail_url} alt={a.title} loading="lazy" />
                          : <div className="ps-artwork-card__fallback" />
                        }
                      </div>
                      <div className="ps-artwork-card__footer">
                        <p className="ps-artwork-card__title">{a.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">No favorited artworks yet.</p>
              )}
            </section>

            </>)}
          </main>
        </div>
      </div>

      {followModal && (
        <FollowListModal
          userId={profile.id}
          tab={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}
      {activeBoard && (
        <BoardLightbox
          board={activeBoard}
          boardOwner={profile ? { id: profile.id, username: profile.username, avatar_url: profile.avatar_url, role: profile.role } : null}
          onClose={() => { setActiveBoard(null); setSearchParams({}) }}
        />
      )}
      {noteOpen && (
        <LeaveNoteModal
          targetId={profile.id}
          existingNote={myNote}
          authFetch={authFetch}
          onSaved={(note) => setMyNote(note)}
          onDeleted={() => setMyNote(null)}
          onClose={() => setNoteOpen(false)}
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
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
