import { useState, useEffect, useCallback } from 'react'
import { getFollowedGames } from '../utils/bookmarks'
import { useAuth } from '../context/AuthContext'

const API           = import.meta.env.VITE_API_URL || '/api'
const CACHE_KEY     = 'gv_notif_cache'
const CACHE_TTL_MS  = 5 * 60 * 1000   // 5 minutes
const LAST_SEEN_KEY = 'gv_notif_last_seen'

export function useNotifications() {
  const { isLoggedIn, loadingAuth, authFetch } = useAuth()

  const [allItems,     setAllItems]     = useState([])
  const [socialItems,  setSocialItems]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [lastSeen,     setLastSeen]     = useState(
    () => localStorage.getItem(LAST_SEEN_KEY) || null
  )
  const [followedSlugs, setFollowedSlugs] = useState(
    () => new Set(getFollowedGames().map(g => g.id))
  )

  // Re-read followed games when the user follows/unfollows
  useEffect(() => {
    const sync = () => setFollowedSlugs(new Set(getFollowedGames().map(g => g.id)))
    window.addEventListener('gv:followedGamesChanged', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('gv:followedGamesChanged', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // ── Game video feed (public, cached) ──────────────────────────────
  const fetchItems = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          setAllItems(Array.isArray(cached.data) ? cached.data : [])
          setLoading(false)
          return
        }
      } catch { /* stale/corrupt — fall through */ }
    }
    try {
      const res  = await fetch(`${API}/notifications`)
      const data = res.ok ? await res.json() : []
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
      setAllItems(Array.isArray(data) ? data : [])
    } catch {
      setAllItems([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  // ── Personal / social notifications (auth, no cache) ─────────────
  const fetchSocial = useCallback(async () => {
    if (!isLoggedIn) { setSocialItems([]); return }
    try {
      const res  = await authFetch(`${API}/notifications/social`)
      const data = res.ok ? await res.json() : []
      setSocialItems(Array.isArray(data) ? data : [])
    } catch {
      setSocialItems([])
    }
  }, [isLoggedIn, authFetch])

  useEffect(() => {
    if (loadingAuth) return
    fetchSocial()
  }, [loadingAuth, fetchSocial])

  // ── Derived values ────────────────────────────────────────────────

  // Only surface game items for followed games
  const items = allItems.filter(item => followedSlugs.has(item.game_slug))

  const gameUnread   = items.filter(item =>
    !lastSeen || new Date(item.published_at) > new Date(lastSeen)
  ).length
  const socialUnread = socialItems.filter(n => !n.read).length
  const unreadCount  = gameUnread + socialUnread

  const markAllRead = useCallback(() => {
    // Game feed — update localStorage timestamp
    const now = new Date().toISOString()
    localStorage.setItem(LAST_SEEN_KEY, now)
    setLastSeen(now)

    // Social — update DB + optimistically clear local read flags
    if (isLoggedIn) {
      authFetch(`${API}/notifications/social/read-all`, { method: 'POST' }).catch(() => {})
      setSocialItems(prev => prev.map(n => ({ ...n, read: true })))
    }
  }, [isLoggedIn, authFetch])

  const followingAnyGame = followedSlugs.size > 0

  return { items, socialItems, loading, unreadCount, lastSeen, markAllRead, followingAnyGame }
}
