require('dotenv').config();
const { reclassifyExistingVideos } = require('../src/services/youtubeIngestionService');
const { classifyVideoTitle } = require('../src/services/videoClassifier');
const { pool, query } = require('../src/config/db');

(async () => {
  // Standard pass: re-evaluate published videos, set to draft if no longer matching
  await reclassifyExistingVideos('genshin-impact');

  // Draft recovery pass: re-evaluate draft videos and republish those that now match a category
  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', ['genshin-impact']);
  const gameId = gameRows[0]?.id;
  if (gameId) {
    const { rows: drafts } = await query(
      `SELECT id, title FROM media_content
       WHERE game_id=$1 AND external_platform='YouTube' AND status='draft' AND is_automated=TRUE`,
      [gameId]
    );
    let recovered = 0;
    for (const row of drafts) {
      const category = classifyVideoTitle('genshin-impact', row.title);
      if (category) {
        await query(`UPDATE media_content SET status='published', category=$1 WHERE id=$2`, [category, row.id]);
        recovered++;
      }
    }
    if (recovered > 0) console.log(`[Genshin] Recovered ${recovered} draft videos back to published.`);
  }

  const { rows } = await pool.query(
    `SELECT category, COUNT(*) AS count
     FROM media_content mc
     JOIN games g ON g.id = mc.game_id
     WHERE g.slug = 'genshin-impact' AND mc.status = 'published'
     GROUP BY category ORDER BY category`
  );

  console.log('\nRemaining published videos:');
  rows.forEach(r => console.log(`  ${r.category.padEnd(20)} ${r.count}`));

  await pool.end();
})();
