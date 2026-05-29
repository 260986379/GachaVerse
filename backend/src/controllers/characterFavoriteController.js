const { query } = require('../config/db');
const { UUID_RE } = require('../utils/uuid');

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

const reorderFavChars = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ ok: true });
    const valid = ids.filter(id => UUID_RE.test(id));
    if (valid.length === 0) return res.json({ ok: true });
    await query(
      `UPDATE user_favorite_characters AS ufc
       SET sort_order = v.pos
       FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, pos)
       WHERE ufc.user_id = $2 AND ufc.character_id = v.id`,
      [valid, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

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
       ORDER BY ufc.sort_order ASC, ufc.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

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
       ORDER BY ufc.sort_order ASC, ufc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavChar, removeFavChar, reorderFavChars, getMyFavChars, getPublicFavChars };
