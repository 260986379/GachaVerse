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
const FOLLOWED_USERS_KEY    = 'gv_followed_users'
const BOARD_COMMENTS_PREFIX = 'gv_board_comments_'
const GAME_UID_PREFIX       = 'gv_game_uid_'
const BOARDS_KEY            = 'gv_boards'
const PROFILE_BANNER_KEY    = 'gv_profile_banner'
const PROFILE_PFP_KEY       = 'gv_profile_pfp'
const FAV_LIMIT             = 9
const BOARDS_LIMIT          = 10

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

/** Persist a reordered video list (regular + BGM combined) */
export const saveFavVideos = (list) => save(k(VIDEOS_KEY), list)

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

/** Persist a reordered characters list */
export const saveFavChars = (list) => save(k(CHARS_KEY), list)

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

/** Persist a reordered artworks list */
export const saveFavArtworks = (list) => save(k(FAV_ART_KEY), list)

// ── Followed games ────────────────────────────────────────────────────────
export const getFollowedGames = () => load(k(FOLLOWS_KEY))
export const isFollowingGame  = (id) => load(k(FOLLOWS_KEY)).some((g) => g.id === id)

export function toggleFollowGame(game) {
  const list = load(k(FOLLOWS_KEY))
  const exists = list.some((g) => g.id === game.id)
  save(k(FOLLOWS_KEY), exists ? list.filter((g) => g.id !== game.id) : [...list, game])
  // Notify same-tab listeners (storage event only fires in other tabs)
  window.dispatchEvent(new CustomEvent('gv:followedGamesChanged'))
  return !exists
}

// ── Followed users (legacy localStorage — superseded by DB follows) ───────
export const getFollowedUsers = () => load(k(FOLLOWED_USERS_KEY))
export const isFollowingUser  = (userId) => load(k(FOLLOWED_USERS_KEY)).some((u) => u.id === userId)

export function toggleFollowUser(user) {
  const list = load(k(FOLLOWED_USERS_KEY))
  const exists = list.some((u) => u.id === user.id)
  save(k(FOLLOWED_USERS_KEY), exists ? list.filter((u) => u.id !== user.id) : [...list, user])
  return !exists
}

// ── Board comments ────────────────────────────────────────────────────────
export const getBoardComments = (boardId) => load(k(BOARD_COMMENTS_PREFIX + boardId))

export function addBoardComment(boardId, text) {
  const list = load(k(BOARD_COMMENTS_PREFIX + boardId))
  const entry = { id: crypto.randomUUID(), text: text.trim(), author: 'You', createdAt: new Date().toISOString() }
  save(k(BOARD_COMMENTS_PREFIX + boardId), [...list, entry])
  return entry
}

export function deleteBoardComment(boardId, commentId) {
  const key = k(BOARD_COMMENTS_PREFIX + boardId)
  save(key, load(key).filter((c) => c.id !== commentId))
}

// ── Profile images ────────────────────────────────────────────────────────
export const getProfileBanner  = () => localStorage.getItem(k(PROFILE_BANNER_KEY)) || null
export const setProfileBanner  = (url) => localStorage.setItem(k(PROFILE_BANNER_KEY), url)
export const clearProfileBanner = () => localStorage.removeItem(k(PROFILE_BANNER_KEY))

export const getProfilePfp    = () => localStorage.getItem(k(PROFILE_PFP_KEY)) || null
export const setProfilePfp    = (url) => localStorage.setItem(k(PROFILE_PFP_KEY), url)
export const clearProfilePfp  = () => localStorage.removeItem(k(PROFILE_PFP_KEY))

// ── Game UIDs ─────────────────────────────────────────────────────────────
export const getGameUID    = (gameId) => localStorage.getItem(k(GAME_UID_PREFIX + gameId)) || null
export const setGameUID    = (gameId, uid) => localStorage.setItem(k(GAME_UID_PREFIX + gameId), uid)
export const removeGameUID = (gameId) => localStorage.removeItem(k(GAME_UID_PREFIX + gameId))

// ── Boards ────────────────────────────────────────────────────────────────
export const getBoards       = () => load(k(BOARDS_KEY))
export const getBoardsByGame = (gameId) => load(k(BOARDS_KEY)).filter((b) => b.gameId === gameId)

export function addBoard(board) {
  const list = load(k(BOARDS_KEY))
  if (list.length >= BOARDS_LIMIT) return null
  const entry = { ...board, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  save(k(BOARDS_KEY), [...list, entry])
  return entry
}

export function removeBoard(id) {
  save(k(BOARDS_KEY), load(k(BOARDS_KEY)).filter((b) => b.id !== id))
}
