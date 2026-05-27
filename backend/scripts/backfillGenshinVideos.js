require('dotenv').config();
const { ingestVideosForGame, reclassifyExistingVideos } = require('../src/services/youtubeIngestionService');
const config = require('../src/config');
const { pool, query } = require('../src/config/db');

const GENSHIN = {
  name: 'Genshin Impact',
  slug: 'genshin-impact',
  description: 'An open-world action RPG set in the magical world of Teyvat. Explore vast landscapes across 7 elemental nations.',
  developer: 'HoYoverse',
  publisher: 'HoYoverse',
  release_date: '2020-09-28',
  cover_image_url: 'https://img.youtube.com/vi/b8MsWzHvLXQ/maxresdefault.jpg',
  banner_image_url: 'https://img.youtube.com/vi/b8MsWzHvLXQ/maxresdefault.jpg',
  platforms: ['iOS', 'Android', 'PC', 'PS4', 'PS5'],
  genres: ['Action RPG', 'Gacha'],
};

(async () => {
  // 1. Ensure Genshin exists in the DB
  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (slug) DO NOTHING`,
    [GENSHIN.name, GENSHIN.slug, GENSHIN.description, GENSHIN.developer, GENSHIN.publisher,
     GENSHIN.release_date, GENSHIN.cover_image_url, GENSHIN.banner_image_url, GENSHIN.platforms, GENSHIN.genres]
  );
  console.log('[Genshin] Game row ensured.\n');

  // 2. Drop all existing automated YouTube videos for Genshin so the re-ingestion is clean
  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', ['genshin-impact']);
  const gameId = gameRows[0]?.id;
  if (gameId) {
    const { rowCount } = await query(
      `DELETE FROM media_content WHERE game_id=$1 AND external_platform='YouTube' AND is_automated=TRUE`,
      [gameId]
    );
    console.log(`[Genshin] Cleared ${rowCount} existing automated YouTube videos.\n`);
  }

  // 3. Full backfill — walks the entire channel history
  console.log('[Genshin] Starting full backfill (this may take a few minutes)...\n');
  await ingestVideosForGame('genshin-impact', config.GENSHIN_YOUTUBE_CHANNEL_ID, { forceBackfill: true });

  // 4. Reclassify to apply latest classifier rules
  console.log('\n[Genshin] Reclassifying with current rules...');
  await reclassifyExistingVideos('genshin-impact');

  // 5. Summary
  const { rows } = await pool.query(
    `SELECT mc.category, COUNT(*) AS count
     FROM media_content mc
     JOIN games g ON g.id = mc.game_id
     WHERE g.slug = 'genshin-impact' AND mc.external_platform = 'YouTube' AND mc.status = 'published'
     GROUP BY mc.category
     ORDER BY mc.category`
  );

  console.log('\n[Genshin] Final video counts by category:');
  if (rows.length === 0) {
    console.log('  (none — check classifier rules or channel ID)');
  } else {
    rows.forEach(r => console.log(`  ${r.category.padEnd(20)} ${r.count} videos`));
  }

  await pool.end();
})();
