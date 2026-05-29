const { query } = require('../config/db');

/**
 * POST /api/videos/:id/favorite
 * Toggle a video favorite for the authenticated user.
 * Returns { favorited: bool }
 */
const addFavorite = async (req, res, next) => {
  try {
    await query(
      'INSERT INTO user_favorite_videos (user_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    await query(
      'DELETE FROM user_favorite_videos WHERE user_id = $1 AND video_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ favorited: false });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos/favorites
 * Returns the authenticated user's favorited videos as full objects.
 */
const getMyFavorites = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.external_id, mc.thumbnail_url,
              mc.source_url, mc.category, mc.published_at, mc.view_count
       FROM user_favorite_videos ufv
       JOIN media_content mc ON mc.id = ufv.video_id
       WHERE ufv.user_id = $1
       ORDER BY ufv.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id/favorites/videos — public, view another user's fav videos
 */
const getPublicFavVideos = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.external_id, mc.thumbnail_url,
              mc.source_url, mc.category, mc.published_at
       FROM user_favorite_videos ufv
       JOIN media_content mc ON mc.id = ufv.video_id
       WHERE ufv.user_id = $1
       ORDER BY ufv.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavorite, removeFavorite, getMyFavorites, getPublicFavVideos };
