require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const { rows } = await pool.query(
    `SELECT external_id, title, published_at FROM media_content WHERE category = 'Lore' ORDER BY published_at DESC`
  );
  rows.forEach(r => console.log(r.published_at?.toISOString().slice(0,10), '|', r.title));
  await pool.end();
})();
