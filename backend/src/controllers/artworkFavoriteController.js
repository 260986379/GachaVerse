const { query } = require('../config/db');
const { UUID_RE } = require('../utils/uuid');

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

const reorderFavArtworks = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ ok: true });
    const valid = ids.filter(id => UUID_RE.test(id));
    if (valid.length === 0) return res.json({ ok: true });
    await query(
      `UPDATE user_favorite_artworks AS ufa
       SET sort_order = v.pos
       FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, pos)
       WHERE ufa.user_id = $2 AND ufa.media_id = v.id`,
      [valid, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const getMyFavArtworks = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.thumbnail_url, mc.source_url,
              mc.category, mc.published_at
       FROM user_favorite_artworks ufa
       JOIN media_content mc ON mc.id = ufa.media_id
       WHERE ufa.user_id = $1
       ORDER BY ufa.sort_order ASC, ufa.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getPublicFavArtworks = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.thumbnail_url, mc.source_url,
              mc.category, mc.published_at
       FROM user_favorite_artworks ufa
       JOIN media_content mc ON mc.id = ufa.media_id
       WHERE ufa.user_id = $1
       ORDER BY ufa.sort_order ASC, ufa.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavArtwork, removeFavArtwork, reorderFavArtworks, getMyFavArtworks, getPublicFavArtworks };
