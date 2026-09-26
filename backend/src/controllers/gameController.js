const { query } = require('../config/db');

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
    const limit  = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
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

// Media lists are public, identical for every caller, and only change when the
// hourly ingestion runs. Letting Firebase Hosting's CDN serve repeats keeps the
// bulk of this traffic off Cloud Run and Postgres entirely.
const MEDIA_CACHE_SECONDS = 300;

// Safety ceiling, not pagination. MediaTab searches and CastTab matches
// characters against the whole list client-side, so slicing it into pages would
// silently break both. 2000 is well clear of the largest game today (~520 rows)
// and exists only to stop unbounded growth; if a game approaches it, move the
// search and character matching server-side rather than raising this.
const MEDIA_MAX_ROWS = 2000;

const getGameMedia = async (req, res, next) => {
  try {
    const game = await resolveGame(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    // `description` is deliberately not selected: it was 66% of the response
    // payload and no client reads it.
    const { rows } = await query(
      `SELECT id, title, external_platform, external_id, source_url, thumbnail_url, published_at, category, is_automated, view_count, tags
       FROM media_content
       WHERE game_id=$1 AND status='published'
       ORDER BY published_at DESC
       LIMIT $2`,
      [game.id, MEDIA_MAX_ROWS]
    );
    res.set('Cache-Control', `public, max-age=${MEDIA_CACHE_SECONDS}`);
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
    // Same safety ceiling as /media (#10): the tab needs the whole gallery, so it
    // is capped rather than paged. Keeps the NEWEST rows if a game ever exceeds
    // it, then returns them oldest-first as before.
    const { rows } = await query(
      `SELECT * FROM (
         SELECT id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, category
         FROM media_content
         WHERE game_id=$1 AND status='published' AND category = ANY($2)
         ORDER BY published_at DESC
         LIMIT $3
       ) newest
       ORDER BY published_at ASC`,
      [game.id, ART_CATEGORIES, MEDIA_MAX_ROWS]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getAllArt = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT m.id, m.title, m.source_url, m.thumbnail_url, m.published_at, m.category,
              g.name AS game_name, g.slug AS game_id
       FROM media_content m
       JOIN games g ON g.id = m.game_id
       WHERE m.status='published' AND m.category = ANY($1)
       ORDER BY g.name ASC, m.published_at ASC`,
      [ART_CATEGORIES]
    );
    res.json(rows);
  } catch (err) {
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

const TRENDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let trendingCache = null;
let trendingCachedAt = 0;

/**
 * GET /api/games/trending
 * Returns the top 4 implemented games ranked by recency of their trending
 * category videos, each paired with their latest spotlight video.
 * Shape: [{ slug, videoId, videoTitle }]
 */
const getTrendingGames = async (req, res, next) => {
  try {
    if (trendingCache && Date.now() - trendingCachedAt < TRENDING_CACHE_TTL) {
      return res.json(trendingCache);
    }

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

    trendingCache = ranked.map((r) => ({
      slug:       r.slug,
      videoId:    videoByGameId[r.id]?.external_id ?? null,
      videoTitle: videoByGameId[r.id]?.title       ?? null,
    }));
    trendingCachedAt = Date.now();
    res.json(trendingCache);
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

module.exports = { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt, getAllArt, getTrendingGames, getLatestVideoDates };
