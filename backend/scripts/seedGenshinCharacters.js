/**
 * Seed Genshin Impact characters from frontend/src/data/genshinCharacters.json.
 * Run: node backend/scripts/seedGenshinCharacters.js
 * Safe to re-run — uses upsert on (game_id, name).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');
const CHARACTERS = require('../../frontend/src/data/genshinCharacters.json');

const main = async () => {
  await testConnection();

  const { rows: gameRows } = await query(`SELECT id FROM games WHERE slug = 'genshin-impact'`);
  if (!gameRows.length) {
    console.error('genshin-impact game row not found — start the backend once first.');
    process.exit(1);
  }
  const gameId = gameRows[0].id;

  let added = 0;
  let updated = 0;

  for (const c of CHARACTERS) {
    const portraitUrl = `/characters/genshin/portraits/${c.name.replace(/ /g, '_')}_Wish.webp`

    const { rows } = await query(
      `INSERT INTO characters
         (game_id, name, rarity, element_type, combat_type, faction, version, icon_url, splash_art_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (game_id, name) DO UPDATE
         SET rarity         = EXCLUDED.rarity,
             element_type   = EXCLUDED.element_type,
             combat_type    = EXCLUDED.combat_type,
             faction        = EXCLUDED.faction,
             version        = EXCLUDED.version,
             icon_url       = COALESCE(EXCLUDED.icon_url, characters.icon_url),
             splash_art_url = EXCLUDED.splash_art_url,
             updated_at     = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [gameId, c.name, c.rarity, c.element_type, c.combat_type, c.faction, c.version || null, c.icon_url || null, portraitUrl]
    );
    if (rows[0]?.inserted) added++; else updated++;
    console.log(`  ${rows[0]?.inserted ? '+ added' : '~ updated'}: ${c.name}`);
  }

  const { rows: total } = await query(`SELECT COUNT(*) FROM characters WHERE game_id = $1`, [gameId]);
  console.log(`\nDone — ${added} inserted, ${updated} updated. Total Genshin: ${total[0].count}`);
  process.exit(0);
};

main().catch(err => { console.error(err); process.exit(1); });
