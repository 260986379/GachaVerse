/**
 * One-time seed for all ZZZ characters.
 * Run: node backend/scripts/seedZZZCharacters.js
 * Safe to re-run — uses upsert on (game_id, name).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');

// MCs have no element/type/season — handled separately.
const MAIN_CHARACTERS = ['Belle', 'Wise'];

// Rarity stored as SSR / SR to match existing schema convention.
// display_name = what shows on the card (first name, or full for special cases).
// title = Void Hunter / special title shown in the panel.
const CHARACTERS = [
  { name: 'Alice Thymefield',       display_name: 'Alice',            rarity: 'SSR', element: 'Physical', combat_type: 'Anomaly',  faction: 'Spook Shack',                                                           season: 2 },
  { name: 'Anby Demara',            display_name: 'Anby',             rarity: 'SR',  element: 'Electric', combat_type: 'Stun',     faction: 'Cunning Hares',                                                          season: 1 },
  { name: 'Anby: Soldier 0',        display_name: 'Anby: Soldier 0',  rarity: 'SSR', element: 'Electric', combat_type: 'Attack',   faction: 'Defense Force - Silver Squad',                                           season: 1 },
  { name: 'Anton Ivanov',           display_name: 'Anton',            rarity: 'SR',  element: 'Electric', combat_type: 'Attack',   faction: 'Belobog Heavy Industries',                                               season: 1 },
  { name: 'Aria',                   display_name: 'Aria',             rarity: 'SSR', element: 'Ether',    combat_type: 'Anomaly',  faction: 'Angels of Delusion',                                                     season: 2 },
  { name: 'Astra Yao',              display_name: 'Astra',            rarity: 'SSR', element: 'Ether',    combat_type: 'Support',  faction: 'Stars of Lyra',                                                          season: 1 },
  { name: 'Banyue',                 display_name: 'Banyue',           rarity: 'SSR', element: 'Fire',     combat_type: 'Rupture',  faction: 'Krampus Compliance Authority',                                           season: 2 },
  { name: 'Ben Bigger',             display_name: 'Ben',              rarity: 'SR',  element: 'Fire',     combat_type: 'Defense',  faction: 'Belobog Heavy Industries',                                               season: 1 },
  { name: 'Billy Kid',              display_name: 'Billy',            rarity: 'SR',  element: 'Physical', combat_type: 'Attack',   faction: 'Cunning Hares',                                                          season: 1 },
  { name: 'Billy: Starlight',       display_name: 'Billy: Starlight', rarity: 'SSR', element: 'Physical', combat_type: 'Rupture',  faction: 'Cunning Hares',                                                          season: 2 },
  { name: 'Burnice White',          display_name: 'Burnice',          rarity: 'SSR', element: 'Fire',     combat_type: 'Anomaly',  faction: 'Sons of Calydon',                                                        season: 1 },
  { name: 'Caesar King',            display_name: 'Caesar',           rarity: 'SSR', element: 'Physical', combat_type: 'Defense',  faction: 'Sons of Calydon',                                                        season: 1 },
  { name: 'Cissia',                 display_name: 'Cissia',           rarity: 'SSR', element: 'Electric', combat_type: 'Attack',   faction: 'Public Security - Metropolitan Order Division',                          season: 2 },
  { name: 'Corin Wickes',           display_name: 'Corin',            rarity: 'SR',  element: 'Physical', combat_type: 'Attack',   faction: 'Victoria Housekeeping',                                                  season: 1 },
  { name: 'Dialyn',                 display_name: 'Dialyn',           rarity: 'SSR', element: 'Physical', combat_type: 'Stun',     faction: 'Krampus Compliance Authority',                                           season: 2 },
  { name: 'Ellen Joe',              display_name: 'Ellen',            rarity: 'SSR', element: 'Ice',      combat_type: 'Attack',   faction: 'Victoria Housekeeping',                                                  season: 1 },
  { name: 'Evelyn Chevalier',       display_name: 'Evelyn',           rarity: 'SSR', element: 'Fire',     combat_type: 'Attack',   faction: 'Stars of Lyra',                                                          season: 1 },
  { name: 'Grace Howard',           display_name: 'Grace',            rarity: 'SR',  element: 'Electric', combat_type: 'Anomaly',  faction: 'Belobog Heavy Industries',                                               season: 1 },
  { name: 'Asaba Harumasa',         display_name: 'Harumasa',         rarity: 'SSR', element: 'Electric', combat_type: 'Attack',   faction: 'Hollow Special Operations Section 6',                                    season: 1 },
  { name: 'Hugo Vlad',              display_name: 'Hugo',             rarity: 'SSR', element: 'Ice',      combat_type: 'Attack',   faction: 'Mockingbird',                                                            season: 1 },
  { name: 'Jane Doe',               display_name: 'Jane',             rarity: 'SSR', element: 'Physical', combat_type: 'Anomaly',  faction: 'Public Security - Criminal Investigation Special Response Team',         season: 1 },
  { name: 'Ju Fufu',                display_name: 'Ju Fufu',          rarity: 'SSR', element: 'Fire',     combat_type: 'Stun',     faction: 'Yunkui Summit',                                                          season: 2 },
  { name: 'Koleda Belobog',         display_name: 'Koleda',           rarity: 'SSR', element: 'Fire',     combat_type: 'Stun',     faction: 'Belobog Heavy Industries',                                               season: 1 },
  { name: 'Lighter',                display_name: 'Lighter',          rarity: 'SSR', element: 'Fire',     combat_type: 'Stun',     faction: 'Sons of Calydon',                                                        season: 1 },
  { name: 'Lucia Elowen',           display_name: 'Lucia',            rarity: 'SSR', element: 'Ether',    combat_type: 'Support',  faction: 'Spook Shack',                                                            season: 2 },
  { name: 'Luciana de Montefio',    display_name: 'Luciana',          rarity: 'SR',  element: 'Fire',     combat_type: 'Support',  faction: 'Sons of Calydon',                                                        season: 1 },
  { name: 'Von Lycaon',             display_name: 'Lycaon',           rarity: 'SSR', element: 'Ice',      combat_type: 'Stun',     faction: 'Victoria Housekeeping',                                                  season: 1 },
  { name: 'Komano Manato',          display_name: 'Manato',           rarity: 'SR',  element: 'Fire',     combat_type: 'Rupture',  faction: 'Spook Shack',                                                            season: 2 },
  { name: 'Hoshimi Miyabi',         display_name: 'Miyabi',           rarity: 'SSR', element: 'Ice',      combat_type: 'Anomaly',  faction: 'Hollow Special Operations Section 6',                                    season: 1, special_type: 'Frostfire',  title: 'Void Hunter - Isshin Muga' },
  { name: 'Nangong Yu',             display_name: 'Nangong Yu',       rarity: 'SSR', element: 'Ether',    combat_type: 'Stun',     faction: 'Angels of Delusion',                                                     season: 2 },
  { name: 'Nekomiya Mana',          display_name: 'Nekomiya',         rarity: 'SSR', element: 'Physical', combat_type: 'Attack',   faction: 'Cunning Hares',                                                          season: 1 },
  { name: 'Nicole Demara',          display_name: 'Nicole',           rarity: 'SR',  element: 'Ether',    combat_type: 'Support',  faction: 'Cunning Hares',                                                          season: 1 },
  { name: 'Orphie & Magus',         display_name: 'Orphie & Magus',   rarity: 'SSR', element: 'Fire',     combat_type: 'Attack',   faction: 'Defense Force - Obol Squad',                                             season: 2 },
  { name: 'Pan Yinhu',              display_name: 'Pan Yinhu',        rarity: 'SR',  element: 'Physical', combat_type: 'Stun',     faction: 'Yunkui Summit',                                                          season: 2 },
  { name: 'Piper Wheel',            display_name: 'Piper',            rarity: 'SR',  element: 'Physical', combat_type: 'Anomaly',  faction: 'Sons of Calydon',                                                        season: 1 },
  { name: 'Promeia',                display_name: 'Promeia',          rarity: 'SSR', element: 'Ice',      combat_type: 'Anomaly',  faction: 'Krampus Compliance Authority',                                           season: 2 },
  { name: 'Pulchra Fellini',        display_name: 'Pulchra',          rarity: 'SR',  element: 'Physical', combat_type: 'Stun',     faction: 'Sons of Calydon',                                                        season: 1 },
  { name: 'Qingyi',                 display_name: 'Qingyi',           rarity: 'SSR', element: 'Electric', combat_type: 'Stun',     faction: 'Public Security - Criminal Investigation Special Response Team',         season: 1 },
  { name: 'Alexandrina Sebastiane', display_name: 'Alexandrina',      rarity: 'SSR', element: 'Electric', combat_type: 'Support',  faction: 'Victoria Housekeeping',                                                  season: 1 },
  { name: 'Seed',                   display_name: 'Seed',             rarity: 'SSR', element: 'Electric', combat_type: 'Attack',   faction: 'Defense Force - Obol Squad',                                             season: 2 },
  { name: 'Seth Lowell',            display_name: 'Seth',             rarity: 'SR',  element: 'Electric', combat_type: 'Defense',  faction: 'Public Security - Criminal Investigation Special Response Team',         season: 1 },
  { name: 'Soldier 11',             display_name: 'Soldier 11',       rarity: 'SSR', element: 'Fire',     combat_type: 'Attack',   faction: 'Defense Force - Obol Squad',                                             season: 1 },
  { name: 'Soukaku',                display_name: 'Soukaku',          rarity: 'SR',  element: 'Ice',      combat_type: 'Support',  faction: 'Hollow Special Operations Section 6',                                    season: 1 },
  { name: 'Sunna',                  display_name: 'Sunna',            rarity: 'SSR', element: 'Physical', combat_type: 'Support',  faction: 'Angels of Delusion',                                                     season: 2 },
  { name: 'Trigger',                display_name: 'Trigger',          rarity: 'SSR', element: 'Electric', combat_type: 'Stun',     faction: 'Defense Force - Obol Squad',                                             season: 1 },
  { name: 'Vivian Banshee',         display_name: 'Vivian',           rarity: 'SSR', element: 'Ether',    combat_type: 'Anomaly',  faction: 'Mockingbird',                                                            season: 1 },
  { name: 'Tsukishiro Yanagi',      display_name: 'Yanagi',           rarity: 'SSR', element: 'Electric', combat_type: 'Anomaly',  faction: 'Hollow Special Operations Section 6',                                    season: 1 },
  { name: 'Ye Shunguang',           display_name: 'Ye Shunguang',     rarity: 'SSR', element: 'Physical', combat_type: 'Attack',   faction: 'Yunkui Summit',                                                          season: 2, special_type: 'Honed Edge',  title: 'Void Hunter - Qingming Arbiter' },
  { name: 'Yidhari Murphy',         display_name: 'Yidhari',          rarity: 'SSR', element: 'Ice',      combat_type: 'Rupture',  faction: 'Spook Shack',                                                            season: 2 },
  { name: 'Yixuan',                 display_name: 'Yixuan',           rarity: 'SSR', element: 'Ether',    combat_type: 'Rupture',  faction: 'Yunkui Summit',                                                          season: 2, special_type: 'Auric Ink',   title: 'Void Hunter Level' },
  { name: 'Ukinami Yuzuha',         display_name: 'Yuzuha',           rarity: 'SSR', element: 'Physical', combat_type: 'Attack',   faction: 'Spook Shack',                                                            season: 2 },
  { name: 'Zhao',                   display_name: 'Zhao',             rarity: 'SSR', element: 'Ice',      combat_type: 'Defense',  faction: 'Krampus Compliance Authority',                                           season: 2 },
  { name: 'Zhu Yuan',               display_name: 'Zhu Yuan',         rarity: 'SSR', element: 'Ether',    combat_type: 'Attack',   faction: 'Public Security - Criminal Investigation Special Response Team',         season: 1 },
];

const main = async () => {
  await testConnection();

  const { rows: gameRows } = await query(`SELECT id FROM games WHERE slug = 'zenless-zone-zero'`);
  if (!gameRows.length) {
    console.error('ZZZ game row not found — start the backend once first.');
    process.exit(1);
  }
  const gameId = gameRows[0].id;

  let added = 0;
  let updated = 0;

  // MCs — no attributes, just name + special faction
  for (const mc of MAIN_CHARACTERS) {
    const { rows } = await query(
      `INSERT INTO characters (game_id, name, display_name, faction)
       VALUES ($1,$2,$2,'Main Character')
       ON CONFLICT (game_id, name) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             faction      = EXCLUDED.faction,
             updated_at   = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [gameId, mc]
    );
    if (rows[0]?.inserted) added++; else updated++;
  }

  for (const c of CHARACTERS) {
    const { rows } = await query(
      `INSERT INTO characters
         (game_id, name, display_name, rarity, element_type, combat_type, special_type, faction, title, season)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (game_id, name) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             rarity       = EXCLUDED.rarity,
             element_type = EXCLUDED.element_type,
             combat_type  = EXCLUDED.combat_type,
             special_type = EXCLUDED.special_type,
             faction      = EXCLUDED.faction,
             title        = EXCLUDED.title,
             season       = EXCLUDED.season,
             updated_at   = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [
        gameId,
        c.name,
        c.display_name,
        c.rarity,
        c.element,
        c.combat_type,
        c.special_type || null,
        c.faction,
        c.title || null,
        c.season,
      ]
    );
    if (rows[0]?.inserted) added++; else updated++;
  }

  const { rows: total } = await query(`SELECT COUNT(*) FROM characters WHERE game_id = $1`, [gameId]);
  console.log(`Done — ${added} inserted, ${updated} updated. Total ZZZ: ${total[0].count}`);
  process.exit(0);
};

main().catch((err) => { console.error(err); process.exit(1); });
