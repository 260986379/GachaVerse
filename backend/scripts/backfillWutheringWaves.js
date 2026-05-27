require('dotenv').config();
const { ingestVideosForGame, reclassifyExistingVideos } = require('../src/services/youtubeIngestionService');
const config = require('../src/config');
const { pool, query } = require('../src/config/db');

const WW = {
  name: 'Wuthering Waves',
  slug: 'wuthering-waves',
  description: 'An open-world action RPG with fast-paced combat in a post-apocalyptic world filled with mysterious Tacet Discords.',
  developer: 'Kuro Games',
  publisher: 'Kuro Games',
  release_date: '2024-05-22',
  cover_image_url: 'https://img.youtube.com/vi/DrkE-mw2Nxg/maxresdefault.jpg',
  banner_image_url: 'https://img.youtube.com/vi/DrkE-mw2Nxg/maxresdefault.jpg',
  platforms: ['iOS', 'Android', 'PC'],
  genres: ['Action RPG', 'Gacha'],
};

(async () => {
  // 1. Ensure WW exists in the DB
  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (slug) DO NOTHING`,
    [WW.name, WW.slug, WW.description, WW.developer, WW.publisher, WW.release_date,
     WW.cover_image_url, WW.banner_image_url, WW.platforms, WW.genres]
  );
  console.log('[WW] Game row ensured.\n');

  // 2. Clear existing automated YouTube videos for a clean re-ingest
  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', ['wuthering-waves']);
  const gameId = gameRows[0]?.id;
  if (gameId) {
    const { rowCount } = await query(
      `DELETE FROM media_content WHERE game_id=$1 AND external_platform='YouTube' AND is_automated=TRUE`,
      [gameId]
    );
    console.log(`[WW] Cleared ${rowCount} existing automated YouTube videos.\n`);
  }

  // 3. Full backfill
  console.log('[WW] Starting full backfill (this may take a few minutes)...\n');
  await ingestVideosForGame('wuthering-waves', config.WW_YOUTUBE_CHANNEL_ID, { forceBackfill: true });

  // 4. Reclassify to apply latest rules
  console.log('\n[WW] Reclassifying with current rules...');
  await reclassifyExistingVideos('wuthering-waves');

  // 5. Summary
  const { rows } = await pool.query(
    `SELECT mc.category, COUNT(*) AS count
     FROM media_content mc
     JOIN games g ON g.id = mc.game_id
     WHERE g.slug = 'wuthering-waves' AND mc.external_platform = 'YouTube' AND mc.status = 'published'
     GROUP BY mc.category
     ORDER BY mc.category`
  );

  console.log('\n[WW] Final video counts by category:');
  if (rows.length === 0) {
    console.log('  (none — check classifier rules or channel ID)');
  } else {
    rows.forEach(r => console.log(`  ${r.category.padEnd(22)} ${r.count} videos`));
  }

  await pool.end();
})();
