const { query } = require('../config/db');

const ZZZ = {
  name: 'Zenless Zone Zero',
  slug: 'zenless-zone-zero',
  description: 'A stylish action RPG set in New Eridu, humanity\'s last urban sanctuary against the supernatural Hollow invasion.',
  developer: 'HoYoverse',
  publisher: 'HoYoverse',
  release_date: '2024-07-04',
  cover_image_url: 'https://img.youtube.com/vi/L5DEAV17cYY/maxresdefault.jpg',
  banner_image_url: 'https://img.youtube.com/vi/L5DEAV17cYY/maxresdefault.jpg',
  platforms: ['iOS', 'Android', 'PC', 'PS5'],
  genres: ['Action RPG', 'Gacha'],
};

const NIKKE = {
  name: 'NIKKE: Goddess of Victory',
  slug: 'nikke',
  description: 'Command a squad of Nikkes — humanoid weapons — to reclaim a post-apocalyptic world from alien invaders.',
  developer: 'Shift Up',
  publisher: 'Level Infinite',
  release_date: '2022-11-04',
  cover_image_url: 'https://img.youtube.com/vi/6lRHrO2rfPA/maxresdefault.jpg',
  banner_image_url: 'https://img.youtube.com/vi/6lRHrO2rfPA/maxresdefault.jpg',
  platforms: ['iOS', 'Android', 'PC'],
  genres: ['Shooter RPG', 'Gacha'],
};

const CDN_ZZZ = 'https://act-webstatic.hoyoverse.com/game_record/zzz/role_square_avatar/role_square_avatar_';
const CDN_NIKKE = 'https://nikke.fandom.com/wiki/Special:Redirect/file/';

const ZZZ_CHARACTERS = [
  { name: 'Ellen Joe',    rarity: 'SSR', element_type: 'Ice',      icon_url: `${CDN_ZZZ}1181.png`, description: 'A celebrated idol by day, a razor-sharp fighter by night. Ellen commands ice with effortless precision.' },
  { name: 'Zhu Yuan',    rarity: 'SSR', element_type: 'Ether',    icon_url: `${CDN_ZZZ}1141.png`, description: 'A sharp-witted Special Response officer who cuts through Hollows — and red tape — with equal efficiency.' },
  { name: 'Von Lycaon',  rarity: 'SSR', element_type: 'Ice',      icon_url: `${CDN_ZZZ}1101.png`, description: 'Victoria Housekeeping\'s impeccably mannered butler conceals a wolf\'s ferocity beneath a polished exterior.' },
  { name: 'Rina',        rarity: 'SSR', element_type: 'Electric', icon_url: `${CDN_ZZZ}1081.png`, description: 'A doll-like performer who orchestrates battles through her twin marionette partners, Drusilla and Anastella.' },
  { name: 'Soldier 11',  rarity: 'SSR', element_type: 'Fire',     icon_url: `${CDN_ZZZ}1061.png`, description: 'A Victoria Housekeeping operative of few words and massive impact, greatsword blazing with every strike.' },
  { name: 'Belle',       rarity: 'SSR', element_type: 'Physical', icon_url: `${CDN_ZZZ}1010.png`, description: 'The Proxy of New Eridu — resourceful, adaptable, and drawn into conflicts far larger than any one Hollow.' },
  { name: 'Nicole',      rarity: 'SR',  element_type: 'Ether',    icon_url: `${CDN_ZZZ}1031.png`, description: 'Leader of the Cunning Hares. Sharp instincts and a gambler\'s nerve make her one of New Eridu\'s best fixers.' },
  { name: 'Soukaku',     rarity: 'SR',  element_type: 'Ice',      icon_url: `${CDN_ZZZ}1021.png`, description: 'A miko from the Hollow Research Commission who channels ancient wind and ice arts into devastating assaults.' },
];

const NIKKE_CHARACTERS = [
  { name: 'Modernia',  rarity: 'SSR', element_type: 'Fire',     icon_url: `${CDN_NIKKE}Modernia_icon.png`,  description: 'One of the four Nikkes of the Apocalypse. Modernia\'s minigun pours out firepower at a terrifying scale.' },
  { name: 'Scarlet',   rarity: 'SSR', element_type: 'Fire',     icon_url: `${CDN_NIKKE}Scarlet_icon.png`,   description: 'Called the Black Hurricane, Scarlet is a legendary Nikke whose relentless blade leaves no opening.' },
  { name: 'Alice',     rarity: 'SSR', element_type: 'Electric', icon_url: `${CDN_NIKKE}Alice_icon.png`,     description: 'A Nikke who perceives the world through her own peculiar logic, inspired by a story of a white rabbit.' },
  { name: 'Rapi',      rarity: 'SSR', element_type: 'Electric', icon_url: `${CDN_NIKKE}Rapi_icon.png`,      description: 'Squad leader of Counters. Stoic and decisive, Rapi shoulders the mission with iron resolve.' },
  { name: 'Blanc',     rarity: 'SSR', element_type: 'Water',    icon_url: `${CDN_NIKKE}Blanc_icon.png`,     description: 'One half of a synchronized duo. Blanc\'s calm tactical mind complements her partner Noir perfectly.' },
  { name: 'Anis',      rarity: 'SR',  element_type: 'Electric', icon_url: `${CDN_NIKKE}Anis_icon.png`,      description: 'The squad\'s explosive wildcard. Anis charges into every battle with a grin and an oversized hammer.' },
  { name: 'Neon',      rarity: 'SR',  element_type: 'Fire',     icon_url: `${CDN_NIKKE}Neon_icon.png`,      description: 'Self-declared treasure hunter and the squad\'s fastest runner — especially when profit is involved.' },
  { name: 'Yuni',      rarity: 'SR',  element_type: 'Wind',     icon_url: `${CDN_NIKKE}Yuni_icon.png`,      description: 'The gentle heart of the squad. Yuni fights to protect every life, no matter how small.' },
];

const seedInitialGames = async () => {
  const existing = await query('SELECT COUNT(*) FROM games');
  if (parseInt(existing.rows[0].count) > 0) return;

  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [ZZZ.name, ZZZ.slug, ZZZ.description, ZZZ.developer, ZZZ.publisher, ZZZ.release_date, ZZZ.cover_image_url, ZZZ.banner_image_url, ZZZ.platforms, ZZZ.genres]
  );

  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [NIKKE.name, NIKKE.slug, NIKKE.description, NIKKE.developer, NIKKE.publisher, NIKKE.release_date, NIKKE.cover_image_url, NIKKE.banner_image_url, NIKKE.platforms, NIKKE.genres]
  );

  console.log('Games seeded: ZZZ and NIKKE');
};

const seedInitialCharacters = async () => {
  const { rows } = await query('SELECT id, slug FROM games WHERE slug IN ($1, $2)', ['zenless-zone-zero', 'nikke']);
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  // Delete old rows so we can re-seed with the expanded, image-enriched data
  await query('DELETE FROM characters WHERE game_id = ANY($1)', [Object.values(gameMap)]);

  for (const char of ZZZ_CHARACTERS) {
    await query(
      `INSERT INTO characters (game_id, name, rarity, element_type, description, icon_url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [gameMap['zenless-zone-zero'], char.name, char.rarity, char.element_type, char.description, char.icon_url]
    );
  }

  for (const char of NIKKE_CHARACTERS) {
    await query(
      `INSERT INTO characters (game_id, name, rarity, element_type, description, icon_url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [gameMap['nikke'], char.name, char.rarity, char.element_type, char.description, char.icon_url]
    );
  }

  console.log('Characters seeded: ZZZ and NIKKE');
};

// Demo YouTube videos seeded so the Media tab works before real ingestion runs.
// These are real video IDs from the official ZZZ and Nikke YouTube channels.
const ZZZ_VIDEOS = [
  { external_id: 'L5DEAV17cYY', title: 'Zenless Zone Zero — Official Launch Trailer', description: 'Welcome to New Eridu. Zenless Zone Zero is now available.', published_at: '2024-07-04T00:00:00Z' },
  { external_id: 'b8lktGCEMXw', title: 'Zenless Zone Zero — Story Trailer "Hollow Special Operations"', description: 'The Hollows have arrived. Special operations begin.', published_at: '2024-05-15T00:00:00Z' },
  { external_id: 'mXFKKs7cMpg', title: 'Zenless Zone Zero — Character Demo: Ellen Joe', description: 'Ice-cold precision. Ellen Joe enters the fray.', published_at: '2024-06-20T00:00:00Z' },
  { external_id: 'bRvxkVcWL5k', title: 'Zenless Zone Zero — Version 1.1 Update Trailer', description: 'New story, new characters, new Hollows. Version 1.1 is here.', published_at: '2024-08-14T00:00:00Z' },
];

const NIKKE_VIDEOS = [
  { external_id: '6lRHrO2rfPA', title: 'NIKKE: Goddess of Victory — Official Launch Trailer', description: 'Humanity\'s last hope. The Nikkes stand ready.', published_at: '2022-11-04T00:00:00Z' },
  { external_id: 'ztPIEFPMzC8', title: 'NIKKE — "Overzone" Story Trailer', description: 'The battle for the surface reaches its climax.', published_at: '2023-06-01T00:00:00Z' },
  { external_id: 'KNb3MObHMeQ', title: 'NIKKE — Character Trailer: Modernia', description: 'One of the four Nikkes of the Apocalypse awakens.', published_at: '2023-03-10T00:00:00Z' },
];

// Demo news articles — placeholder tweets pointing to official accounts.
// Real tweet IDs will populate automatically once TWITTER_BEARER_TOKEN is set.
const ZZZ_NEWS = [
  { title: '🎮 Zenless Zone Zero is now officially live! Download and step into New Eridu today. #ZenlessZoneZero', source_url: 'https://twitter.com/ZenlessZoneZero', published_at: '2024-07-04T12:00:00Z' },
  { title: '⚡ Version 1.1 is here! New story chapters, Ellen Joe & Zhu Yuan banners, and more await. #ZZZ', source_url: 'https://twitter.com/ZenlessZoneZero', published_at: '2024-08-14T10:00:00Z' },
  { title: '🌆 Explore the Districts of New Eridu in Zenless Zone Zero. Each zone hides secrets waiting to be uncovered.', source_url: 'https://twitter.com/ZenlessZoneZero', published_at: '2024-06-25T14:00:00Z' },
];

const NIKKE_NEWS = [
  { title: '🚀 NIKKE: Goddess of Victory global launch is LIVE! Join the resistance and reclaim the surface. #NIKKE', source_url: 'https://twitter.com/NIKKE_en', published_at: '2022-11-04T12:00:00Z' },
  { title: '🔥 New event: Overzone — the battle for the surface intensifies. Log in and fight alongside your Nikkes!', source_url: 'https://twitter.com/NIKKE_en', published_at: '2023-06-01T10:00:00Z' },
  { title: '💥 SSR Modernia is available in the new banner! Don\'t miss your chance to add her to your squad. #NIKKE', source_url: 'https://twitter.com/NIKKE_en', published_at: '2023-03-10T14:00:00Z' },
];

const seedNewsAndMedia = async () => {
  const mediaCount = await query('SELECT COUNT(*) FROM media_content');
  if (parseInt(mediaCount.rows[0].count) > 0) return;

  const { rows } = await query('SELECT id, slug FROM games WHERE slug IN ($1,$2)', ['zenless-zone-zero', 'nikke']);
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  for (const v of ZZZ_VIDEOS) {
    await query(
      `INSERT INTO media_content (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,FALSE,'published','Video')
       ON CONFLICT (external_id) DO NOTHING`,
      [gameMap['zenless-zone-zero'], v.title, v.description, v.external_id, `https://www.youtube.com/watch?v=${v.external_id}`, `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`, v.published_at]
    );
  }

  for (const v of NIKKE_VIDEOS) {
    await query(
      `INSERT INTO media_content (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,FALSE,'published','Video')
       ON CONFLICT (external_id) DO NOTHING`,
      [gameMap['nikke'], v.title, v.description, v.external_id, `https://www.youtube.com/watch?v=${v.external_id}`, `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`, v.published_at]
    );
  }

  for (const n of ZZZ_NEWS) {
    await query(
      `INSERT INTO news_articles (game_id, title, external_platform, source_url, published_at, is_automated, status)
       VALUES ($1,$2,'TwitterX',$3,$4,FALSE,'published')`,
      [gameMap['zenless-zone-zero'], n.title, n.source_url, n.published_at]
    );
  }

  for (const n of NIKKE_NEWS) {
    await query(
      `INSERT INTO news_articles (game_id, title, external_platform, source_url, published_at, is_automated, status)
       VALUES ($1,$2,'TwitterX',$3,$4,FALSE,'published')`,
      [gameMap['nikke'], n.title, n.source_url, n.published_at]
    );
  }

  console.log('Demo news and media seeded for ZZZ and NIKKE');
};

const ensureInitialGameAndIngestionLogs = async () => {
  await seedInitialGames();
  await seedInitialCharacters();
  await seedNewsAndMedia();

  const { rows } = await query('SELECT id, slug FROM games WHERE slug IN ($1,$2)', ['zenless-zone-zero', 'nikke']);
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  for (const [slug, gameId] of Object.entries(gameMap)) {
    for (const platform of ['TwitterX', 'YouTube']) {
      await query(
        `INSERT INTO ingestion_logs (game_id, platform, status) VALUES ($1,$2,'pending')
         ON CONFLICT (game_id, platform) DO NOTHING`,
        [gameId, platform]
      );
    }
  }
};

module.exports = { seedInitialGames, seedInitialCharacters, ensureInitialGameAndIngestionLogs };
