/**
 * Sets icon_url and splash_art_urls for every ZZZ character using local assets.
 * Run: node backend/scripts/updateZZZImages.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');

const ICON_BASE     = '/characters/zzz/icons';
const PORTRAIT_BASE = '/characters/zzz/portraits';

// Maps DB character name → file slug (Agent_{slug}_Icon/Portrait.webp)
const CHAR_TO_SLUG = {
  'Alexandrina Sebastiane': 'Alexandrina_Sebastiane',
  'Alice Thymefield':       'Alice_Thymefield',
  'Anby Demara':            'Anby_Demara',
  'Anby: Soldier 0':        'Soldier_0_-_Anby',
  'Anton Ivanov':           'Anton_Ivanov',
  'Aria':                   'Aria',
  'Asaba Harumasa':         'Asaba_Harumasa',
  'Astra Yao':              'Astra_Yao',
  'Banyue':                 'Banyue',
  'Belle':                  'Belle',
  'Ben Bigger':             'Ben_Bigger',
  'Billy Kid':              'Billy_Kid',
  'Burnice White':          'Burnice_White',
  'Caesar King':            'Caesar_King',
  'Cissia':                 'Cissia',
  'Corin Wickes':           'Corin_Wickes',
  'Dialyn':                 'Dialyn',
  'Ellen Joe':              'Ellen_Joe',
  'Evelyn Chevalier':       'Evelyn_Chevalier',
  'Grace Howard':           'Grace_Howard',
  'Hoshimi Miyabi':         'Hoshimi_Miyabi',
  'Hugo Vlad':              'Hugo_Vlad',
  'Jane Doe':               'Jane_Doe',
  'Ju Fufu':                'Ju_Fufu',
  'Koleda Belobog':         'Koleda_Belobog',
  'Komano Manato':          'Komano_Manato',
  'Lighter':                'Lighter',
  'Lucia Elowen':           'Lucia_Elowen',
  'Luciana de Montefio':    'Luciana_de_Montefio',
  'Von Lycaon':             'Von_Lycaon',
  'Nangong Yu':             'Nangong_Yu',
  'Nekomiya Mana':          'Nekomiya_Mana',
  'Nicole Demara':          'Nicole_Demara',
  'Orphie & Magus':         'Orphie_Magnusson_and_Magus',
  'Pan Yinhu':              'Pan_Yinhu',
  'Piper Wheel':            'Piper_Wheel',
  'Promeia':                'Promeia',
  'Pulchra Fellini':        'Pulchra_Fellini',
  'Qingyi':                 'Qingyi',
  'Seed':                   'Seed',
  'Seth Lowell':            'Seth_Lowell',
  'Soldier 11':             'Soldier_11',
  'Soukaku':                'Soukaku',
  'Sunna':                  'Sunna',
  'Trigger':                'Trigger',
  'Tsukishiro Yanagi':      'Tsukishiro_Yanagi',
  'Ukinami Yuzuha':         'Ukinami_Yuzuha',
  'Vivian Banshee':         'Vivian_Banshee',
  'Wise':                   'Wise',
  'Ye Shunguang':           'Ye_Shunguang',
  'Yidhari Murphy':         'Yidhari_Murphy',
  'Yixuan':                 'Yixuan',
  'Zhao':                   'Zhao',
  'Zhu Yuan':               'Zhu_Yuan',
  'Billy: Starlight':       'Starlight_-_Billy_Kid',
};

const main = async () => {
  await testConnection();

  const { rows: [game] } = await query(`SELECT id FROM games WHERE slug = 'zenless-zone-zero'`);
  if (!game) { console.error('ZZZ game not found.'); process.exit(1); }

  // Rename Lucia → Lucia Elowen before updating images
  const { rowCount: luciaFixed } = await query(
    `UPDATE characters SET name = 'Lucia Elowen', display_name = 'Lucia'
     WHERE game_id = $1 AND name = 'Lucia'`,
    [game.id]
  );
  if (luciaFixed) console.log('Renamed: Lucia → Lucia Elowen (display name stays "Lucia")');

  let updated = 0;
  let skipped = 0;

  for (const [charName, slug] of Object.entries(CHAR_TO_SLUG)) {
    const iconUrl     = `${ICON_BASE}/Agent_${slug}_Icon.webp`;
    const portraitUrl = `${PORTRAIT_BASE}/Agent_${slug}_Portrait.webp`;

    const { rowCount } = await query(
      `UPDATE characters
       SET icon_url        = $1,
           splash_art_urls = ARRAY[$2::text],
           updated_at      = NOW()
       WHERE game_id = $3 AND name = $4`,
      [iconUrl, portraitUrl, game.id, charName]
    );

    if (rowCount) updated++;
    else { console.log(`  NOT FOUND in DB: "${charName}"`); skipped++; }
  }

  console.log(`\nDone — ${updated} updated, ${skipped} not found.`);
  process.exit(0);
};

main().catch((err) => { console.error(err); process.exit(1); });
