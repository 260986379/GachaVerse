require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const { rowCount } = await pool.query(
    `DELETE FROM media_content
     WHERE external_platform = 'YouTube'
       AND is_automated = FALSE
       AND game_id = (SELECT id FROM games WHERE slug = 'zenless-zone-zero')`
  );
  console.log(`Deleted ${rowCount} hardcoded ZZZ video row(s).`);
  await pool.end();
})();
