const { query } = require('../config/db');
const { UUID_RE } = require('../utils/uuid');

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

const reorderFavorites = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ ok: true });
    const valid = ids.filter(id => UUID_RE.test(id));
    if (valid.length === 0) return res.json({ ok: true });
    await query(
      `UPDATE user_favorite_videos AS ufv
       SET sort_order = v.pos
       FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, pos)
       WHERE ufv.user_id = $2 AND ufv.video_id = v.id`,
      [valid, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const getMyFavorites = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.external_id, mc.thumbnail_url,
              mc.source_url, mc.category, mc.published_at, mc.view_count
       FROM user_favorite_videos ufv
       JOIN media_content mc ON mc.id = ufv.video_id
       WHERE ufv.user_id = $1
       ORDER BY ufv.sort_order ASC, ufv.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getPublicFavVideos = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.external_id, mc.thumbnail_url,
              mc.source_url, mc.category, mc.published_at
       FROM user_favorite_videos ufv
       JOIN media_content mc ON mc.id = ufv.video_id
       WHERE ufv.user_id = $1
       ORDER BY ufv.sort_order ASC, ufv.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavorite, removeFavorite, reorderFavorites, getMyFavorites, getPublicFavVideos };
