import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleStyle, getRoleGlow } from '../utils/roles'
import AuthModal from '../components/ui/AuthModal'
import BoardLightbox from '../components/ui/BoardLightbox'
import './AccountPage.css'
import './UserProfilePage.css'

const API = import.meta.env.VITE_API_URL || '/api'

const SHOWCASE_GAMES = [
  { id: 'zenless-zone-zero', name: 'Zenless Zone Zero', color1: '#f59e42', color2: '#b04a00' },
  { id: 'nikke',             name: 'NIKKE',             color1: '#4a90e2', color2: '#1a3a6a' },
]

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

/* ── Main page ───────────────────────────────────────────────────── */

export default function UserProfilePage() {
  const { username } = useParams()
  const navigate     = useNavigate()
  const { user: me, isLoggedIn, loadingAuth, authFetch } = useAuth()

  const [profile,      setProfile]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [following,    setFollowing]    = useState(false)
  const [followCounts, setFollowCounts] = useState({ followers_count: 0, following_count: 0 })
  const [followModal,  setFollowModal]  = useState(null)
  const [authOpen,     setAuthOpen]     = useState(false)
  const [boards,        setBoards]        = useState([])
  const [activeBoard,   setActiveBoard]   = useState(null)
  const [gameAccounts,  setGameAccounts]  = useState([])
  const [myNote,        setMyNote]        = useState(undefined) // undefined = not fetched yet
  const [noteOpen,      setNoteOpen]      = useState(false)

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

  /* Fetch boards + linked game accounts when profile loads */
  useEffect(() => {
    if (!profile?.id) return
    fetch(`${API}/boards/user/${profile.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]))
    fetch(`${API}/users/${profile.id}/game-accounts`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setGameAccounts(Array.isArray(data) ? data : []))
      .catch(() => setGameAccounts([]))
  }, [profile?.id])

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

              {/* Follow button */}
              <button
                className={`up-follow-btn${following ? ' up-follow-btn--following' : ''}`}
                onClick={handleFollow}
              >
                {following ? 'Following' : 'Follow'}
              </button>

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

            {/* Badges */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Badges</h2>
              </div>
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
            </section>

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
                      onClick={() => setActiveBoard(b)}
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
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Game Account Showcase</h2>
              </div>
              <div className="profile-hscroll">
                {SHOWCASE_GAMES.map(g => {
                  const linked = gameAccounts.find(a => a.game_id === g.id)
                  return (
                    <div
                      key={g.id}
                      className="ps-game-card"
                      style={{ '--g1': g.color1, '--g2': g.color2 }}
                    >
                      <div className="ps-game-card__cover" />
                      <div className="ps-game-card__body">
                        <p className="ps-game-card__name">{g.name}</p>
                        <div className="ps-game-card__stats">
                          <span className="ps-game-card__stat">
                            <span>UID</span>
                            <span>{linked ? linked.uid : '—'}</span>
                          </span>
                          <span className="ps-game-card__stat"><span>Level</span><span>—</span></span>
                          <span className="ps-game-card__stat"><span>Rank</span><span>—</span></span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Followed Games — read-only, empty */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Followed Games</h2>
              </div>
              <p className="profile-empty">No followed games to display.</p>
            </section>

            {/* Favorite Videos — read-only, empty */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Videos</h2>
              </div>
              <p className="profile-empty">No favorited videos to display.</p>
            </section>

            {/* Favorite BGM — read-only, empty */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite BGM</h2>
              </div>
              <p className="profile-empty">No favorited BGM to display.</p>
            </section>

            {/* Favorite Characters — read-only, empty */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Characters</h2>
              </div>
              <p className="profile-empty">No favorited characters to display.</p>
            </section>

            {/* Favorite Artworks — read-only, empty */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">Favorite Artworks</h2>
              </div>
              <p className="profile-empty">No favorited artworks to display.</p>
            </section>

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
          onClose={() => setActiveBoard(null)}
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
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
