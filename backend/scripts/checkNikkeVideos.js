require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const { rows: redAsh } = await pool.query(
    `SELECT title, category, status FROM media_content
     WHERE game_id=(SELECT id FROM games WHERE slug='nikke')
     AND external_platform='YouTube' AND title ILIKE '%red ash%'`
  );
  console.log('RED ASH search:', redAsh.length ? redAsh : 'Not found in DB at all');

  const { rows: counts } = await pool.query(
    `SELECT status, COUNT(*) FROM media_content
     WHERE game_id=(SELECT id FROM games WHERE slug='nikke') AND external_platform='YouTube'
     GROUP BY status`
  );
  console.log('By status:', counts);

  const { rows: range } = await pool.query(
    `SELECT MAX(published_at) AS newest, MIN(published_at) AS oldest, COUNT(*) AS total
     FROM media_content
     WHERE game_id=(SELECT id FROM games WHERE slug='nikke') AND external_platform='YouTube'`
  );
  console.log('Date range:', range[0]);

  await pool.end();
})();
