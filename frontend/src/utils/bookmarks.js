const VIDEOS_KEY  = 'gv_fav_videos'
const CHARS_KEY   = 'gv_fav_characters'
const FAV_ART_KEY = 'gv_fav_artworks'
const FOLLOWS_KEY = 'gv_followed_games'
const FOLLOWED_USERS_KEY    = 'gv_followed_users'
const BOARD_COMMENTS_PREFIX = 'gv_board_comments_'
const GAME_UID_PREFIX = 'gv_game_uid_'
const FAV_LIMIT   = 10
const BOARDS_KEY       = 'gv_boards'
const BOARDS_LIMIT     = 10
const BOARDS_SEEDED_KEY = 'gv_boards_seeded_v1'

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') }
  catch { return [] }
}
const save = (key, list) => localStorage.setItem(key, JSON.stringify(list))

export const getFavVideos    = () => load(VIDEOS_KEY)
export const getFavChars     = () => load(CHARS_KEY)
export const getFavArtworks  = () => load(FAV_ART_KEY)

export const isFavArtwork = (id) => load(FAV_ART_KEY).some((a) => a.id === id)

// Returns true if now favorited, false if removed, null if limit reached
export function toggleFavArtwork(artwork) {
  const list = load(FAV_ART_KEY)
  const exists = list.some((a) => a.id === artwork.id)
  if (!exists && list.length >= FAV_LIMIT) return null
  save(FAV_ART_KEY, exists ? list.filter((a) => a.id !== artwork.id) : [...list, artwork])
  return !exists
}

export const isFavVideo = (id) => load(VIDEOS_KEY).some((v) => v.id === id)
export const isFavChar  = (id) => load(CHARS_KEY).some((c) => c.id === id)

// Returns true if now favorited, false if removed, null if limit reached
export function toggleFavVideo(video) {
  const list = load(VIDEOS_KEY)
  const exists = list.some((v) => v.id === video.id)
  if (!exists && list.length >= FAV_LIMIT) return null
  save(VIDEOS_KEY, exists ? list.filter((v) => v.id !== video.id) : [...list, video])
  return !exists
}

export const getFollowedGames = () => load(FOLLOWS_KEY)
export const isFollowingGame  = (id) => load(FOLLOWS_KEY).some((g) => g.id === id)

// ── Follow community users ───────────────────────────────────────
export const getFollowedUsers  = () => load(FOLLOWED_USERS_KEY)
export const isFollowingUser   = (userId) => load(FOLLOWED_USERS_KEY).some((u) => u.id === userId)
export function toggleFollowUser(user) {
  const list = load(FOLLOWED_USERS_KEY)
  const exists = list.some((u) => u.id === user.id)
  save(FOLLOWED_USERS_KEY, exists ? list.filter((u) => u.id !== user.id) : [...list, user])
  return !exists
}

// ── Board comments ───────────────────────────────────────────────
export const getBoardComments = (boardId) => load(BOARD_COMMENTS_PREFIX + boardId)
export function addBoardComment(boardId, text) {
  const list = load(BOARD_COMMENTS_PREFIX + boardId)
  const entry = { id: crypto.randomUUID(), text: text.trim(), author: 'You', createdAt: new Date().toISOString() }
  save(BOARD_COMMENTS_PREFIX + boardId, [...list, entry])
  return entry
}
export function deleteBoardComment(boardId, commentId) {
  save(BOARD_COMMENTS_PREFIX + boardId, load(BOARD_COMMENTS_PREFIX + boardId).filter((c) => c.id !== commentId))
}

// Returns true if now following, false if unfollowed
export function toggleFollowGame(game) {
  const list = load(FOLLOWS_KEY)
  const exists = list.some((g) => g.id === game.id)
  save(FOLLOWS_KEY, exists ? list.filter((g) => g.id !== game.id) : [...list, game])
  return !exists
}

const PROFILE_BANNER_KEY = 'gv_profile_banner'
const PROFILE_PFP_KEY    = 'gv_profile_pfp'

export const getProfileBanner = () => localStorage.getItem(PROFILE_BANNER_KEY) || null
export const setProfileBanner = (dataUrl) => localStorage.setItem(PROFILE_BANNER_KEY, dataUrl)
export const clearProfileBanner = () => localStorage.removeItem(PROFILE_BANNER_KEY)

export const getProfilePfp = () => localStorage.getItem(PROFILE_PFP_KEY) || null
export const setProfilePfp = (dataUrl) => localStorage.setItem(PROFILE_PFP_KEY, dataUrl)
export const clearProfilePfp = () => localStorage.removeItem(PROFILE_PFP_KEY)

export const getGameUID    = (gameId) => localStorage.getItem(GAME_UID_PREFIX + gameId) || null
export const setGameUID    = (gameId, uid) => localStorage.setItem(GAME_UID_PREFIX + gameId, uid)
export const removeGameUID = (gameId) => localStorage.removeItem(GAME_UID_PREFIX + gameId)

// ── Boards ──────────────────────────────────────────────────────
export const getBoards = () => load(BOARDS_KEY)
export const getBoardsByGame = (gameId) => load(BOARDS_KEY).filter((b) => b.gameId === gameId)

// Returns the new entry object, or null if limit reached
export function addBoard(board) {
  const list = load(BOARDS_KEY)
  if (list.length >= BOARDS_LIMIT) return null
  const entry = { ...board, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  save(BOARDS_KEY, [...list, entry])
  return entry
}

export function removeBoard(id) {
  save(BOARDS_KEY, load(BOARDS_KEY).filter((b) => b.id !== id))
}

// Seeds initial board data once (uses static public paths, not data URLs)
export function seedBoards(entries) {
  if (localStorage.getItem(BOARDS_SEEDED_KEY)) return
  if (load(BOARDS_KEY).length === 0) {
    save(BOARDS_KEY, entries.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    })))
  }
  localStorage.setItem(BOARDS_SEEDED_KEY, '1')
}

// Returns true if now favorited, false if removed, null if limit reached
export function toggleFavChar(char) {
  const list = load(CHARS_KEY)
  const exists = list.some((c) => c.id === char.id)
  if (!exists && list.length >= FAV_LIMIT) return null
  save(CHARS_KEY, exists ? list.filter((c) => c.id !== char.id) : [...list, char])
  return !exists
}
