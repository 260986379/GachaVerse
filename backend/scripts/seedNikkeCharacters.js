/**
 * Seed all NIKKE characters from frontend/src/data/nikkeCharacters.json.
 * Run: node backend/scripts/seedNikkeCharacters.js
 * Safe to re-run — uses upsert on (game_id, name).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const { query, testConnection } = require('../src/config/db');
const CHARACTERS = require('../../frontend/src/data/nikkeCharacters.json');

const main = async () => {
  await testConnection();

  const { rows: gameRows } = await query(`SELECT id FROM games WHERE slug = 'nikke'`);
  if (!gameRows.length) {
    console.error('NIKKE game row not found — start the backend once first to seed the games table.');
    process.exit(1);
  }
  const gameId = gameRows[0].id;

  let added = 0;
  let updated = 0;

  for (const c of CHARACTERS) {
    const { rows } = await query(
      `INSERT INTO characters
         (game_id, name, rarity, combat_type, element_type, weapon_type, manufacturer, burst, icon_url, webm_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (game_id, name) DO UPDATE
         SET rarity       = EXCLUDED.rarity,
             combat_type  = EXCLUDED.combat_type,
             element_type = EXCLUDED.element_type,
             weapon_type  = EXCLUDED.weapon_type,
             manufacturer = EXCLUDED.manufacturer,
             burst        = EXCLUDED.burst,
             icon_url     = COALESCE(EXCLUDED.icon_url, characters.icon_url),
             webm_url     = COALESCE(EXCLUDED.webm_url, characters.webm_url),
             updated_at   = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [
        gameId,
        c.name,
        c.rarity,
        c.combat_type,
        c.element_type,
        c.weapon_type,
        c.manufacturer,
        c.burst,
        c.icon_url  || null,
        c.webm_url  || null,
      ]
    );
    if (rows[0]?.inserted) added++; else updated++;
  }

  const { rows: total } = await query(`SELECT COUNT(*) FROM characters WHERE game_id = $1`, [gameId]);
  console.log(`Done — ${added} inserted, ${updated} updated. Total NIKKE: ${total[0].count}`);
};

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { seedNikkeCharacters: main };
