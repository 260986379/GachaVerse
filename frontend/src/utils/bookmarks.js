const VIDEOS_KEY  = 'gv_fav_videos'
const CHARS_KEY   = 'gv_fav_characters'
const FOLLOWS_KEY = 'gv_followed_games'
const FAV_LIMIT   = 10

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') }
  catch { return [] }
}
const save = (key, list) => localStorage.setItem(key, JSON.stringify(list))

export const getFavVideos = () => load(VIDEOS_KEY)
export const getFavChars  = () => load(CHARS_KEY)

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

// Returns true if now following, false if unfollowed
export function toggleFollowGame(game) {
  const list = load(FOLLOWS_KEY)
  const exists = list.some((g) => g.id === game.id)
  save(FOLLOWS_KEY, exists ? list.filter((g) => g.id !== game.id) : [...list, game])
  return !exists
}

// Returns true if now favorited, false if removed, null if limit reached
export function toggleFavChar(char) {
  const list = load(CHARS_KEY)
  const exists = list.some((c) => c.id === char.id)
  if (!exists && list.length >= FAV_LIMIT) return null
  save(CHARS_KEY, exists ? list.filter((c) => c.id !== char.id) : [...list, char])
  return !exists
}
