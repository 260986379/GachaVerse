import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/ui/AuthModal'
import './UserPage.css'

const API = import.meta.env.VITE_API_URL || '/api'

export default function UserPage() {
  const { username } = useParams()
  const { user: me, authFetch, isLoggedIn, refreshUser } = useAuth()

  const [profile,      setProfile]      = useState(null)
  const [followStatus, setFollowStatus] = useState({ following: false, followers_count: 0, following_count: 0 })
  const [loading,      setLoading]      = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [error,        setError]        = useState(null)
  const [authOpen,     setAuthOpen]     = useState(false)
  const [activeTab,    setActiveTab]    = useState('followers') // 'followers' | 'following'
  const [followers,    setFollowers]    = useState([])
  const [following,    setFollowing]    = useState([])

  const isOwnProfile = me?.username === username

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/users/by-username/${encodeURIComponent(username)}`)
        if (!res.ok) throw new Error(res.status === 404 ? 'User not found' : 'Failed to load profile')
        const data = await res.json()
        if (!cancelled) {
          setProfile(data)
          setFollowStatus({
            following:      false,
            followers_count: Number(data.followers_count),
            following_count: Number(data.following_count),
          })
          // Fetch actual follow status if logged in
          if (isLoggedIn && !isOwnProfile) {
            const fsRes = await authFetch(`${API}/users/${data.id}/follow-status`)
            if (fsRes.ok) {
              const fs = await fsRes.json()
              if (!cancelled) setFollowStatus(fs)
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProfile()
    return () => { cancelled = true }
  }, [username, isLoggedIn])

  useEffect(() => {
    if (!profile) return
    Promise.all([
      fetch(`${API}/users/${profile.id}/followers`).then(r => r.json()),
      fetch(`${API}/users/${profile.id}/following`).then(r => r.json()),
    ]).then(([f, g]) => { setFollowers(f); setFollowing(g) }).catch(() => {})
  }, [profile?.id])

  const handleFollow = async () => {
    if (!isLoggedIn) { setAuthOpen(true); return }
    setFollowLoading(true)
    try {
      const method = followStatus.following ? 'DELETE' : 'POST'
      const res = await authFetch(`${API}/users/${profile.id}/follow`, { method })
      if (res.ok) {
        const data = await res.json()
        setFollowStatus(data)
        refreshUser()
        // Re-fetch followers list
        const f = await fetch(`${API}/users/${profile.id}/followers`).then(r => r.json())
        setFollowers(f)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFollowLoading(false)
    }
  }

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  if (loading) return <div className="user-page user-page--loading"><p>Loading…</p></div>
  if (error)   return <div className="user-page user-page--error"><p>{error}</p></div>

  return (
    <div className="user-page">
      {/* Banner */}
      <div
        className="user-banner"
        style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})` } : undefined}
      >
        <div className="user-banner__fade" />
      </div>

      <div className="user-layout">
        {/* Sidebar */}
        <aside className="user-sidebar">
          <div className="user-sidebar__card">
            <div className="user-pfp">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className="user-pfp__img" />
                : <div className="user-pfp__fallback">{profile.username[0].toUpperCase()}</div>
              }
            </div>

            <h2 className="user-sidebar__name">{profile.username}</h2>

            {profile.bio && <p className="user-sidebar__bio">{profile.bio}</p>}

            {/* Follow button */}
            {!isOwnProfile && (
              <button
                className={`user-follow-btn${followStatus.following ? ' user-follow-btn--following' : ''}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? '…' : followStatus.following ? 'Following ✓' : '+ Follow'}
              </button>
            )}

            {/* Social stats */}
            <div className="user-social-stats">
              <button
                className={`user-social-stat${activeTab === 'following' ? ' user-social-stat--active' : ''}`}
                onClick={() => setActiveTab('following')}
              >
                <span className="user-social-stat__value">{followStatus.following_count ?? 0}</span>
                <span className="user-social-stat__label">Following</span>
              </button>
              <div className="user-social-divider" />
              <button
                className={`user-social-stat${activeTab === 'followers' ? ' user-social-stat--active' : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                <span className="user-social-stat__value">{followStatus.followers_count ?? 0}</span>
                <span className="user-social-stat__label">Followers</span>
              </button>
            </div>

            <div className="user-info-rows">
              {profile.birthday && (
                <div className="user-info-row">
                  <span>🎂</span>
                  <span>{new Date(profile.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              <div className="user-info-row">
                <span>📅</span>
                <span>Joined {joinedDate}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="user-main">
          <div className="user-tab-header">
            <h2 className="user-tab-title">
              {activeTab === 'followers' ? 'Followers' : 'Following'}
            </h2>
          </div>

          <div className="user-follow-list">
            {(activeTab === 'followers' ? followers : following).length === 0 ? (
              <p className="user-follow-empty">
                {activeTab === 'followers'
                  ? `${profile.username} has no followers yet.`
                  : `${profile.username} isn't following anyone yet.`
                }
              </p>
            ) : (
              (activeTab === 'followers' ? followers : following).map(u => (
                <a key={u.id} href={`/u/${u.username}`} className="user-follow-card">
                  <div className="user-follow-card__pfp">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.username} />
                      : <span>{u.username[0].toUpperCase()}</span>
                    }
                  </div>
                  <span className="user-follow-card__name">{u.username}</span>
                </a>
              ))
            )}
          </div>
        </main>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
