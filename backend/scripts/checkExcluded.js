require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const { rows } = await pool.query(
    `SELECT title, category, status FROM media_content
     WHERE game_id=(SELECT id FROM games WHERE slug='nikke')
     AND external_platform='YouTube'
     AND status='published'
     AND (title ILIKE '%livestream%' OR title ILIKE '%interview%')
     ORDER BY title`
  );
  console.log(`Found ${rows.length} published interview/livestream videos:`);
  rows.forEach(r => console.log(`  [${r.category}] ${r.title}`));
  await pool.end();
})();
