const { query } = require('../config/db');

/**
 * POST /api/artworks/:id/favorite
 * Toggle an artwork favorite for the authenticated user.
 * Returns { favorited: bool }
 */
const addFavArtwork = async (req, res, next) => {
  try {
    await query(
      'INSERT INTO user_favorite_artworks (user_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

const removeFavArtwork = async (req, res, next) => {
  try {
    await query(
      'DELETE FROM user_favorite_artworks WHERE user_id = $1 AND media_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ favorited: false });
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

/**
 * GET /api/users/:id/favorites/artworks — public
 */
const getPublicFavArtworks = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.thumbnail_url, mc.source_url,
              mc.category, mc.published_at
       FROM user_favorite_artworks ufa
       JOIN media_content mc ON mc.id = ufa.media_id
       WHERE ufa.user_id = $1
       ORDER BY ufa.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavArtwork, removeFavArtwork, getMyFavArtworks, getPublicFavArtworks };
