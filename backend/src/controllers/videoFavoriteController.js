const { query } = require('../config/db');

/**
 * POST /api/videos/:id/favorite
 * Toggle a video favorite for the authenticated user.
 * Returns { favorited: bool }
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const userId  = req.user.id;
    const videoId = req.params.id;

    // Check if already favorited
    const existing = await query(
      'SELECT 1 FROM user_favorite_videos WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );

    if (existing.rows.length > 0) {
      await query(
        'DELETE FROM user_favorite_videos WHERE user_id = $1 AND video_id = $2',
        [userId, videoId]
      );
      return res.json({ favorited: false });
    }

    await query(
      'INSERT INTO user_favorite_videos (user_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, videoId]
    );
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos/favorites
 * Returns the authenticated user's favorited video IDs.
 */
const getMyFavorites = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT video_id FROM user_favorite_videos WHERE user_id = $1',
      [req.user.id]
    );
    res.json(rows.map(r => r.video_id));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/games/:gameId/community-feed
 * Videos favorited by users the requester follows, for this game.
 * Requires auth (optionalAuth — unauthenticated returns []).
 */
const getCommunityFeed = async (req, res, next) => {
  try {
    if (!req.user) return res.json([]);

    const { rows } = await query(
      `SELECT
         mc.id, mc.title, mc.external_id, mc.thumbnail_url,
         mc.source_url, mc.category, mc.published_at, mc.view_count,
         u.id   AS favorited_by_id,
         u.username AS favorited_by,
         u.avatar_url AS favorited_by_avatar,
         ufv.created_at AS favorited_at
       FROM user_favorite_videos ufv
       JOIN media_content mc ON mc.id = ufv.video_id
       JOIN users u           ON u.id  = ufv.user_id
       JOIN games g           ON g.id  = mc.game_id
       WHERE g.slug = $1
         AND mc.status = 'published'
         AND ufv.user_id IN (
           SELECT following_id FROM user_follows WHERE follower_id = $2
         )
       ORDER BY ufv.created_at DESC
       LIMIT 60`,
      [req.params.gameId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleFavorite, getMyFavorites, getCommunityFeed };
