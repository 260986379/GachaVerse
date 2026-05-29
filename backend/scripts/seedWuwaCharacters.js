/**
 * Seed Wuthering Waves characters from frontend/src/data/wuwaCharacters.json.
 * Run: node backend/scripts/seedWuwaCharacters.js
 * Safe to re-run — uses upsert on (game_id, name).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');
const CHARACTERS = require('../../frontend/src/data/wuwaCharacters.json');

const main = async () => {
  await testConnection();

  const { rows: gameRows } = await query(`SELECT id FROM games WHERE slug = 'wuthering-waves'`);
  if (!gameRows.length) {
    console.error('wuthering-waves game row not found — start the backend once first.');
    process.exit(1);
  }
  const gameId = gameRows[0].id;

  let added = 0;
  let updated = 0;

  for (const c of CHARACTERS) {
    const { rows } = await query(
      `INSERT INTO characters
         (game_id, name, rarity, element_type, combat_type, icon_url, splash_art_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (game_id, name) DO UPDATE
         SET rarity         = EXCLUDED.rarity,
             element_type   = EXCLUDED.element_type,
             combat_type    = EXCLUDED.combat_type,
             icon_url       = COALESCE(EXCLUDED.icon_url, characters.icon_url),
             splash_art_url = EXCLUDED.splash_art_url,
             updated_at     = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [gameId, c.name, c.rarity, c.element_type, c.combat_type, c.icon_url || null, c.splash_art_url || null]
    );
    if (rows[0]?.inserted) added++; else updated++;
    console.log(`  ${rows[0]?.inserted ? '+ added' : '~ updated'}: ${c.name}`);
  }

  const { rows: total } = await query(`SELECT COUNT(*) FROM characters WHERE game_id = $1`, [gameId]);
  console.log(`\nDone — ${added} inserted, ${updated} updated. Total WUWA: ${total[0].count}`);
  process.exit(0);
};

main().catch(err => { console.error(err); process.exit(1); });
