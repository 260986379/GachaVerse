require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const { rows } = await pool.query(
    `SELECT title, category, status FROM media_content
     WHERE external_platform='YouTube'
     AND (title ILIKE '%chapter 41%' OR title ILIKE '%chapter 42%' OR title ILIKE '%41~42%')`
  );
  console.log('Chapter 41/42 search:', rows.length ? rows : 'Not in DB at all');

  const { rows: ms } = await pool.query(
    `SELECT title, category FROM media_content
     WHERE game_id=(SELECT id FROM games WHERE slug='nikke')
     AND category='Main Story'
     ORDER BY published_at DESC`
  );
  console.log('\nAll NIKKE Main Story videos:');
  ms.forEach(r => console.log(' ', r.title));

  await pool.end();
})();
