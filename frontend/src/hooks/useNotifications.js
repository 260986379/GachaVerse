import { useState, useEffect, useCallback } from 'react'
import { getFollowedGames } from '../utils/bookmarks'

const API           = import.meta.env.VITE_API_URL || '/api'
const CACHE_KEY     = 'gv_notif_cache'
const CACHE_TTL_MS  = 5 * 60 * 1000   // 5 minutes
const LAST_SEEN_KEY = 'gv_notif_last_seen'

export function useNotifications() {
  const [allItems, setAllItems] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [lastSeen, setLastSeen] = useState(
    () => localStorage.getItem(LAST_SEEN_KEY) || null
  )
  const [followedSlugs, setFollowedSlugs] = useState(
    () => new Set(getFollowedGames().map(g => g.id))
  )

  // Re-read followed games when the user follows/unfollows from another tab or same page
  useEffect(() => {
    const sync = () => setFollowedSlugs(new Set(getFollowedGames().map(g => g.id)))
    window.addEventListener('gv:followedGamesChanged', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('gv:followedGamesChanged', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

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

  // Only surface items for games the user actually follows
  const items = allItems.filter(item => followedSlugs.has(item.game_slug))

  const unreadCount = items.filter(item =>
    !lastSeen || new Date(item.published_at) > new Date(lastSeen)
  ).length

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(LAST_SEEN_KEY, now)
    setLastSeen(now)
  }, [])

  const followingAnyGame = followedSlugs.size > 0

  return { items, loading, unreadCount, lastSeen, markAllRead, followingAnyGame }
}
