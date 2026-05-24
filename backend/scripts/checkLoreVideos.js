require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const { rows } = await pool.query(
    `SELECT external_id, title, category, is_automated
     FROM media_content
     WHERE external_id IN ('UgeN7naPPz4', 'Sq9VtAEBTcM')`
  );
  rows.forEach(r => console.log(r.external_id, '|', r.category, '|', `automated:${r.is_automated}`, '|', r.title));
  await pool.end();
})();
