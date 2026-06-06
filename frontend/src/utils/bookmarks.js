// ── User context ─────────────────────────────────────────────────────────
// Call setCurrentUser(userId) when auth state changes.
// All reads/writes are automatically scoped to that user.
// Guests use 'guest' scope.

const API = import.meta.env.VITE_API_URL || '/api'

let _uid = 'guest'
let _authFetch = null   // set by AuthContext when logged in; null for guests

export function setCurrentUser(userId) {
  _uid = userId || 'guest'
}

/** Called by AuthContext so toggles can sync to DB when the user is logged in. */
export function setAuthFetch(fn) {
  _authFetch = fn || null
}

// Prefix every key with the current user ID
const k = (base) => `${base}__${_uid}`

// ── Storage helpers ───────────────────────────────────────────────────────
const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') }
  catch { return [] }
}
const save = (key, list) => localStorage.setItem(key, JSON.stringify(list))

// ── Base key names (no user prefix — applied via k()) ─────────────────────
const VIDEOS_KEY            = 'gv_fav_videos'
const CHARS_KEY             = 'gv_fav_characters'
const FAV_ART_KEY           = 'gv_fav_artworks'
const FOLLOWS_KEY           = 'gv_followed_games'
const PROFILE_BANNER_KEY    = 'gv_profile_banner'
const PROFILE_PFP_KEY       = 'gv_profile_pfp'
const FAV_LIMIT             = 9

// ── Favorite videos ───────────────────────────────────────────────────────
export const getFavVideos = () => load(k(VIDEOS_KEY))
export const isFavVideo   = (id) => load(k(VIDEOS_KEY)).some((v) => v.id === id)

export function toggleFavVideo(video) {
  const list = load(k(VIDEOS_KEY))
  const exists = list.some((v) => v.id === video.id)
  if (!exists) {
    // Cap regular videos and BGM separately at FAV_LIMIT each
    const isMusic    = video.category === 'Music'
    const sameCategory = list.filter(v => (v.category === 'Music') === isMusic)
    if (sameCategory.length >= FAV_LIMIT) return null
  }
  save(k(VIDEOS_KEY), exists ? list.filter((v) => v.id !== video.id) : [...list, video])
  // Sync to DB for logged-in users (fire-and-forget)
  if (_authFetch && video.id) {
    _authFetch(`${API}/videos/${video.id}/favorite`, { method: exists ? 'DELETE' : 'POST' }).catch(() => {})
  }
  return !exists
}

/** Write video list to localStorage only — no DB sync. Use during init/merge. */
export const writeFavVideosLocal = (list) => save(k(VIDEOS_KEY), list)

/** Persist a reordered video list and sync order to DB. Use from drag handlers. */
export function saveFavVideos(list) {
  save(k(VIDEOS_KEY), list)
  if (_authFetch) {
    const ids = list.map(v => v.id).filter(Boolean)
    _authFetch(`${API}/videos/favorites/reorder`, { method: 'PATCH', body: JSON.stringify({ ids }) }).catch(() => {})
  }
}

// ── Favorite characters ───────────────────────────────────────────────────
export const getFavChars = () => load(k(CHARS_KEY))
export const isFavChar   = (id) => load(k(CHARS_KEY)).some((c) => c.id === id)

export function toggleFavChar(char) {
  const list = load(k(CHARS_KEY))
  const exists = list.some((c) => c.id === char.id)
  if (!exists && list.length >= FAV_LIMIT) return null
  save(k(CHARS_KEY), exists ? list.filter((c) => c.id !== char.id) : [...list, char])
  // Sync to DB for logged-in users — prefer dbId (UUID) over local slug id
  const dbCharId = char.dbId || char.id
  if (_authFetch && dbCharId) {
    _authFetch(`${API}/characters/${dbCharId}/favorite`, { method: exists ? 'DELETE' : 'POST' }).catch(() => {})
  }
  return !exists
}

/** Write characters list to localStorage only — no DB sync. Use during init/merge. */
export const writeFavCharsLocal = (list) => save(k(CHARS_KEY), list)

/** Persist a reordered characters list and sync order to DB. Use from drag handlers. */
export function saveFavChars(list) {
  save(k(CHARS_KEY), list)
  if (_authFetch) {
    const ids = list.map(c => c.dbId || c.id).filter(Boolean)
    _authFetch(`${API}/characters/favorites/reorder`, { method: 'PATCH', body: JSON.stringify({ ids }) }).catch(() => {})
  }
}

// ── Favorite artworks ─────────────────────────────────────────────────────
export const getFavArtworks  = () => load(k(FAV_ART_KEY))
export const isFavArtwork    = (id) => load(k(FAV_ART_KEY)).some((a) => a.id === id)

export function toggleFavArtwork(artwork) {
  const list = load(k(FAV_ART_KEY))
  const exists = list.some((a) => a.id === artwork.id)
  if (!exists && list.length >= FAV_LIMIT) return null
  save(k(FAV_ART_KEY), exists ? list.filter((a) => a.id !== artwork.id) : [...list, artwork])
  // Sync to DB for logged-in users (fire-and-forget)
  if (_authFetch && artwork.id) {
    _authFetch(`${API}/artworks/${artwork.id}/favorite`, { method: exists ? 'DELETE' : 'POST' }).catch(() => {})
  }
  return !exists
}

/** Write artworks list to localStorage only — no DB sync. Use during init/merge. */
export const writeFavArtworksLocal = (list) => save(k(FAV_ART_KEY), list)

/** Persist a reordered artworks list and sync order to DB. Use from drag handlers. */
export function saveFavArtworks(list) {
  save(k(FAV_ART_KEY), list)
  if (_authFetch) {
    const ids = list.map(a => a.id).filter(Boolean)
    _authFetch(`${API}/artworks/favorites/reorder`, { method: 'PATCH', body: JSON.stringify({ ids }) }).catch(() => {})
  }
}

// ── Followed games ────────────────────────────────────────────────────────
export const getFollowedGames = () => load(k(FOLLOWS_KEY))
export const isFollowingGame  = (id) => load(k(FOLLOWS_KEY)).some((g) => g.id === id)

export function toggleFollowGame(game) {
  const list = load(k(FOLLOWS_KEY))
  const exists = list.some((g) => g.id === game.id)
  save(k(FOLLOWS_KEY), exists ? list.filter((g) => g.id !== game.id) : [...list, game])
  window.dispatchEvent(new CustomEvent('gv:followedGamesChanged'))
  if (_authFetch) {
    if (exists) {
      _authFetch(`${API}/users/me/games/${encodeURIComponent(game.id)}`, { method: 'DELETE' }).catch(() => {})
    } else {
      _authFetch(`${API}/users/me/games`, { method: 'POST', body: JSON.stringify({ game_slug: game.id }) }).catch(() => {})
    }
  }
  return !exists
}

export function saveFollowedGames(list) {
  save(k(FOLLOWS_KEY), list)
  window.dispatchEvent(new CustomEvent('gv:followedGamesChanged'))
}

// ── Profile images ────────────────────────────────────────────────────────
export const getProfileBanner   = () => localStorage.getItem(k(PROFILE_BANNER_KEY)) || null
export const setProfileBanner   = (url) => localStorage.setItem(k(PROFILE_BANNER_KEY), url)
export const clearProfileBanner = () => localStorage.removeItem(k(PROFILE_BANNER_KEY))

export const getProfilePfp    = () => localStorage.getItem(k(PROFILE_PFP_KEY)) || null
export const setProfilePfp    = (url) => localStorage.setItem(k(PROFILE_PFP_KEY), url)
export const clearProfilePfp  = () => localStorage.removeItem(k(PROFILE_PFP_KEY))

