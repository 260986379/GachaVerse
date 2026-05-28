const { query } = require('../config/db');

/**
 * POST /api/artworks/:id/favorite
 * Toggle an artwork favorite for the authenticated user.
 * Returns { favorited: bool }
 */
const toggleFavArtwork = async (req, res, next) => {
  try {
    const userId  = req.user.id;
    const mediaId = req.params.id;

    const existing = await query(
      'SELECT 1 FROM user_favorite_artworks WHERE user_id = $1 AND media_id = $2',
      [userId, mediaId]
    );

    if (existing.rows.length > 0) {
      await query(
        'DELETE FROM user_favorite_artworks WHERE user_id = $1 AND media_id = $2',
        [userId, mediaId]
      );
      return res.json({ favorited: false });
    }

    await query(
      'INSERT INTO user_favorite_artworks (user_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, mediaId]
    );
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/artworks/favorites
 * Returns the authenticated user's favorited artworks as full objects.
 */
const getMyFavArtworks = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.thumbnail_url, mc.source_url,
              mc.category, mc.published_at
       FROM user_favorite_artworks ufa
       JOIN media_content mc ON mc.id = ufa.media_id
       WHERE ufa.user_id = $1
       ORDER BY ufa.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleFavArtwork, getMyFavArtworks };
