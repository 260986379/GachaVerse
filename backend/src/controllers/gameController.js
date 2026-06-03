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
    const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = (Math.max(parseInt(req.query.page)  || 1, 1) - 1) * limit;
    const { rows } = await query(
      `SELECT id, title, external_platform, external_id, source_url, published_at, is_automated
       FROM news_articles
       WHERE game_id=$1 AND status='published'
       ORDER BY published_at DESC
       LIMIT $2 OFFSET $3`,
      [game.id, limit + 1, offset]
    );
    const hasMore = rows.length > limit;
    res.json({ items: hasMore ? rows.slice(0, limit) : rows, hasMore });
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

// Categories used to determine recency per game for the trending calculation
// Categories used to both rank trending games and pick the spotlight video.
const TRENDING_CATEGORIES = {
  'zenless-zone-zero': ['Lore', 'Trailer'],
  'nikke':             ['Lore', 'Main Story'],
  'genshin-impact':    ['Main Story'],
  'honkai-star-rail':  ['Main Story'],
  'wuthering-waves':   ['Main Story'],
};

// Build a SQL OR-condition string for per-game category filtering.
// All values come from hardcoded server config, not user input.
const buildCategoryConditions = (gameRows) => {
  return gameRows.map(({ id, slug }) => {
    const cats = (TRENDING_CATEGORIES[slug] ?? [])
      .map((c) => `'${c.replace(/'/g, "''")}'`)
      .join(', ');
    return cats ? `(m.game_id = '${id}' AND m.category IN (${cats}))` : null;
  }).filter(Boolean).join(' OR ');
};

/**
 * GET /api/games/trending
 * Returns the top 4 implemented games ranked by recency of their trending
 * category videos, each paired with their latest spotlight video.
 * Shape: [{ slug, videoId, videoTitle }]
 */
const getTrendingGames = async (req, res, next) => {
  try {
    const trendingSlugs = Object.keys(TRENDING_CATEGORIES);

    // Step 1 — rank games by most recent trending-category video
    const trendingConds = trendingSlugs.map((slug) => {
      const cats = TRENDING_CATEGORIES[slug].map((c) => `'${c.replace(/'/g, "''")}'`).join(', ');
      return `WHEN g.slug = '${slug}' THEN m.category IN (${cats})`;
    }).join('\n        ');

    const { rows: ranked } = await query(
      `SELECT g.id, g.slug, MAX(m.published_at) AS latest_at
       FROM games g
       LEFT JOIN media_content m
         ON m.game_id = g.id
        AND m.status = 'published'
        AND CASE ${trendingConds} ELSE false END
       WHERE g.slug = ANY($1)
       GROUP BY g.id, g.slug
       ORDER BY latest_at DESC NULLS LAST
       LIMIT 4`,
      [trendingSlugs]
    );

    if (ranked.length === 0) return res.json([]);

    // Step 2 — for each top-4 game, get its latest spotlight video
    const spotlightConds = buildCategoryConditions(ranked);
    const gameIds = ranked.map((r) => r.id);

    const { rows: videos } = await query(
      `SELECT DISTINCT ON (m.game_id) m.game_id, m.external_id, m.title
       FROM media_content m
       WHERE m.status = 'published'
         AND m.game_id = ANY($1)
         AND (${spotlightConds})
       ORDER BY m.game_id, m.published_at DESC`,
      [gameIds]
    );

    const videoByGameId = Object.fromEntries(videos.map((v) => [v.game_id, v]));

    res.json(ranked.map((r) => ({
      slug:       r.slug,
      videoId:    videoByGameId[r.id]?.external_id ?? null,
      videoTitle: videoByGameId[r.id]?.title       ?? null,
    })));
  } catch (err) {
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

module.exports = { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt, getPlayer, getTrendingGames, getLatestVideoDates };
