require('dotenv').config();
const { ingestVideosForGame, reclassifyExistingVideos } = require('../src/services/youtubeIngestionService');
const config = require('../src/config');
const { pool } = require('../src/config/db');

(async () => {
  console.log('[Backfill] Full YouTube backfill — ignoring early-exit, walking entire channel history...\n');

  await ingestVideosForGame('zenless-zone-zero', config.ZZZ_YOUTUBE_CHANNEL_ID, { forceBackfill: true });
  await ingestVideosForGame('nikke', config.NIKKE_YOUTUBE_CHANNEL_ID, { forceBackfill: true });
  await ingestVideosForGame('genshin-impact', config.GENSHIN_YOUTUBE_CHANNEL_ID, { forceBackfill: true });

  console.log('\n[Backfill] Reclassifying all existing videos with current classifier rules...');
  await reclassifyExistingVideos('zenless-zone-zero');
  await reclassifyExistingVideos('nikke');
  await reclassifyExistingVideos('genshin-impact');

  const { rows } = await pool.query(
    `SELECT g.name AS game, mc.category, COUNT(*) AS count
     FROM media_content mc
     JOIN games g ON g.id = mc.game_id
     WHERE mc.external_platform = 'YouTube' AND mc.status = 'published'
     GROUP BY g.name, mc.category
     ORDER BY g.name, mc.category`
  );

  console.log('\n[Backfill] Final counts:');
  rows.forEach(r => console.log(`  ${r.game} | ${r.category} | ${r.count} videos`));

  const { rows: redAsh } = await pool.query(
    `SELECT title, category, status FROM media_content
     WHERE external_platform='YouTube' AND title ILIKE '%red ash%'`
  );
  console.log('\n[Backfill] RED ASH check:', redAsh.length ? redAsh : 'Still not found');

  await pool.end();
})();
