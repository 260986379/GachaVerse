const { query } = require('../config/db');

/**
 * POST /api/characters/:id/favorite
 * Toggle a character favorite for the authenticated user.
 * Returns { favorited: bool }
 */
const addFavChar = async (req, res, next) => {
  try {
    await query(
      'INSERT INTO user_favorite_characters (user_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

const removeFavChar = async (req, res, next) => {
  try {
    await query(
      'DELETE FROM user_favorite_characters WHERE user_id = $1 AND character_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ favorited: false });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/characters/favorites
 * Returns the authenticated user's favorited characters as full objects.
 * Includes game_slug via JOIN with games table.
 */
const getMyFavChars = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.display_name, c.icon_url, c.rarity,
              c.element_type, c.role, c.weapon_type,
              g.slug AS game_slug
       FROM user_favorite_characters ufc
       JOIN characters c ON c.id = ufc.character_id
       JOIN games      g ON g.id = c.game_id
       WHERE ufc.user_id = $1
       ORDER BY ufc.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id/favorites/characters — public
 */
const getPublicFavChars = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.display_name, c.icon_url, c.rarity,
              c.element_type, c.weapon_type,
              g.slug AS game_slug
       FROM user_favorite_characters ufc
       JOIN characters c ON c.id = ufc.character_id
       JOIN games      g ON g.id = c.game_id
       WHERE ufc.user_id = $1
       ORDER BY ufc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavChar, removeFavChar, getMyFavChars, getPublicFavChars };
