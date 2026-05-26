require('dotenv').config();
const { runYouTubeIngestion, reclassifyExistingVideos } = require('../src/services/youtubeIngestionService');
const { pool } = require('../src/config/db');

(async () => {
  console.log('[Test] Starting YouTube ingestion test...\n');
  await runYouTubeIngestion();

  console.log('\n[Test] Reclassifying existing videos with updated classifier...');
  await reclassifyExistingVideos('zenless-zone-zero');
  await reclassifyExistingVideos('nikke');

  const { rows } = await pool.query(
    `SELECT g.name AS game, mc.category, COUNT(*) AS count
     FROM media_content mc
     JOIN games g ON g.id = mc.game_id
     WHERE mc.external_platform = 'YouTube' AND mc.status = 'published'
     GROUP BY g.name, mc.category
     ORDER BY g.name, mc.category`
  );

  console.log('\n[Test] Media content in DB after ingestion:');
  if (rows.length === 0) {
    console.log('  (none — check for API errors above)');
  } else {
    rows.forEach(r => console.log(`  ${r.game} | ${r.category} | ${r.count} videos`));
  }

  const { rows: logs } = await pool.query(
    `SELECT g.name AS game, il.status, il.message, il.last_run_at
     FROM ingestion_logs il
     JOIN games g ON g.id = il.game_id
     WHERE il.platform = 'YouTube'`
  );
  console.log('\n[Test] Ingestion logs:');
  logs.forEach(l => console.log(`  ${l.game} | ${l.status} | ${l.message}`));

  await pool.end();
})();
