const { query } = require('../config/db');
const { fetchZZZPlayer, fetchGenshinPlayer, fetchHSRPlayer } = require('../services/enkaService');

const PLAYER_FETCHERS = {
  'zenless-zone-zero': fetchZZZPlayer,
  'genshin-impact':    fetchGenshinPlayer,
  'honkai-star-rail':  fetchHSRPlayer,
};

// Resolves a route param that may be a UUID or a slug to a game row.
const resolveGame = async (idOrSlug) => {
  const isUuid = /^[0-9a-f-]{36}$/.test(idOrSlug);
  const sql = isUuid ? 'SELECT * FROM games WHERE id=$1' : 'SELECT * FROM games WHERE slug=$1';
  const { rows } = await query(sql, [idOrSlug]);
  return rows[0] || null;
};

const getAllGames = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM games ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getGameById = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    res.json(game);
  } catch (err) {
    next(err);
  }
};

const getCharactersByGameId = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const { rows } = await query(
      'SELECT * FROM characters WHERE game_id=$1 ORDER BY name',
      [game.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getGameNews = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const { rows } = await query(
      `SELECT id, title, external_platform, external_id, source_url, published_at, is_automated
       FROM news_articles
       WHERE game_id=$1 AND status='published'
       ORDER BY published_at DESC`,
      [game.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getGameMedia = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const { rows } = await query(
      `SELECT id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, category, is_automated, view_count, tags
       FROM media_content
       WHERE game_id=$1 AND status='published'
       ORDER BY published_at DESC`,
      [game.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getGameBanners = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.json({ current: [], upcoming: [] });

    const { rows } = await query(
      `SELECT id, name, banner_type, starts_at, ends_at, image_url
       FROM game_banners
       WHERE game_id=$1 AND ends_at > NOW()
       ORDER BY ends_at ASC`,
      [game.id]
    );

    const now = new Date();
    const current  = rows.filter((b) => !b.starts_at || new Date(b.starts_at) <= now);
    const upcoming = rows.filter((b) =>  b.starts_at && new Date(b.starts_at)  > now);

    res.json({ current, upcoming });
  } catch (err) {
    next(err);
  }
};

const ART_CATEGORIES = ['Cover Art', 'Wallpapers', 'Holiday Artwork']

const getGameArt = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const { rows } = await query(
      `SELECT id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, category
       FROM media_content
       WHERE game_id=$1 AND status='published' AND category = ANY($2)
       ORDER BY published_at ASC`,
      [game.id, ART_CATEGORIES]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const UID_RE = /^\d{9,10}$/;

const getPlayer = async (req, res, next) => {
  try {
    const { id: gameId, uid } = req.params;
    if (!UID_RE.test(uid)) {
      return res.status(400).json({ message: 'Invalid UID format — must be 9–10 digits.' });
    }
    const fetcher = PLAYER_FETCHERS[gameId];
    if (!fetcher) return res.status(404).json({ message: 'No player API available for this game.' });
    const data = await fetcher(uid);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

const getLatestVideoDates = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT g.slug, MAX(m.published_at) AS latest_published_at
       FROM games g
       LEFT JOIN media_content m ON m.game_id = g.id AND m.status = 'published'
       GROUP BY g.slug`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt, getGameBanners, getPlayer, getLatestVideoDates };
