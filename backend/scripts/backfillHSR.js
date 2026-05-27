require('dotenv').config();
const { ingestVideosForGame, reclassifyExistingVideos } = require('../src/services/youtubeIngestionService');
const config = require('../src/config');
const { pool, query } = require('../src/config/db');

const HSR = {
  name: 'Honkai: Star Rail',
  slug: 'honkai-star-rail',
  description: 'Board a space station and embark on an intergalactic adventure across the stars in this turn-based RPG.',
  developer: 'HoYoverse',
  publisher: 'HoYoverse',
  release_date: '2023-04-26',
  cover_image_url: 'https://img.youtube.com/vi/LkxwwIyXJxE/maxresdefault.jpg',
  banner_image_url: 'https://img.youtube.com/vi/LkxwwIyXJxE/maxresdefault.jpg',
  platforms: ['iOS', 'Android', 'PC', 'PS5'],
  genres: ['Turn-Based RPG', 'Gacha'],
};

(async () => {
  // 1. Ensure HSR exists in the DB
  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (slug) DO NOTHING`,
    [HSR.name, HSR.slug, HSR.description, HSR.developer, HSR.publisher, HSR.release_date,
     HSR.cover_image_url, HSR.banner_image_url, HSR.platforms, HSR.genres]
  );
  console.log('[HSR] Game row ensured.\n');

  // 2. Clear existing automated YouTube videos for a clean re-ingest
  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', ['honkai-star-rail']);
  const gameId = gameRows[0]?.id;
  if (gameId) {
    const { rowCount } = await query(
      `DELETE FROM media_content WHERE game_id=$1 AND external_platform='YouTube' AND is_automated=TRUE`,
      [gameId]
    );
    console.log(`[HSR] Cleared ${rowCount} existing automated YouTube videos.\n`);
  }

  // 3. Full backfill
  console.log('[HSR] Starting full backfill (this may take a few minutes)...\n');
  await ingestVideosForGame('honkai-star-rail', config.HSR_YOUTUBE_CHANNEL_ID, { forceBackfill: true });

  // 4. Reclassify to apply latest rules
  console.log('\n[HSR] Reclassifying with current rules...');
  await reclassifyExistingVideos('honkai-star-rail');

  // 5. Summary
  const { rows } = await pool.query(
    `SELECT mc.category, COUNT(*) AS count
     FROM media_content mc
     JOIN games g ON g.id = mc.game_id
     WHERE g.slug = 'honkai-star-rail' AND mc.external_platform = 'YouTube' AND mc.status = 'published'
     GROUP BY mc.category
     ORDER BY mc.category`
  );

  console.log('\n[HSR] Final video counts by category:');
  if (rows.length === 0) {
    console.log('  (none — check classifier rules or channel ID)');
  } else {
    rows.forEach(r => console.log(`  ${r.category.padEnd(22)} ${r.count} videos`));
  }

  await pool.end();
})();
