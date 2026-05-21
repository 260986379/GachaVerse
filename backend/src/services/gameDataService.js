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

const ZZZ_CHARACTERS = [
  { name: 'Belle', rarity: 'SSR', element_type: 'Physical', description: 'The female protagonist of New Eridu, a skilled Proxy.' },
  { name: 'Wise', rarity: 'SSR', element_type: 'Physical', description: 'The male protagonist of New Eridu, Belle\'s twin brother.' },
  { name: 'Zhu Yuan', rarity: 'SSR', element_type: 'Ether', description: 'A cool-headed officer from the Criminal Investigation Special Response Team.' },
  { name: 'Ellen Joe', rarity: 'SSR', element_type: 'Ice', description: 'A popular idol and deadly fighter with ice-based abilities.' },
  { name: 'Soldier 11', rarity: 'SSR', element_type: 'Fire', description: 'A fierce warrior from Victoria Housekeeping, wielding fire and a greatsword.' },
];

const NIKKE_CHARACTERS = [
  { name: 'Rapi', rarity: 'SSR', element_type: 'Electric', description: 'A serious and disciplined Nikke who serves as the squad leader of Counters.' },
  { name: 'Anis', rarity: 'SR', element_type: 'Electric', description: 'An energetic and cheerful Nikke who loves having fun and teasing her squadmates.' },
  { name: 'Neon', rarity: 'SR', element_type: 'Fire', description: 'A lively Nikke obsessed with money and treasure, always chasing the next big score.' },
  { name: 'Yuni', rarity: 'SR', element_type: 'Wind', description: 'A gentle Nikke with a calm personality and a love for all living things.' },
  { name: 'Modernia', rarity: 'SSR', element_type: 'Fire', description: 'One of the four Nikkes of the Apocalypse, wielding immense destructive power.' },
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
  const existing = await query('SELECT COUNT(*) FROM characters');
  if (parseInt(existing.rows[0].count) > 0) return;

  const { rows } = await query('SELECT id, slug FROM games WHERE slug IN ($1, $2)', ['zenless-zone-zero', 'nikke']);
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  for (const char of ZZZ_CHARACTERS) {
    await query(
      `INSERT INTO characters (game_id, name, rarity, element_type, description) VALUES ($1,$2,$3,$4,$5)`,
      [gameMap['zenless-zone-zero'], char.name, char.rarity, char.element_type, char.description]
    );
  }

  for (const char of NIKKE_CHARACTERS) {
    await query(
      `INSERT INTO characters (game_id, name, rarity, element_type, description) VALUES ($1,$2,$3,$4,$5)`,
      [gameMap['nikke'], char.name, char.rarity, char.element_type, char.description]
    );
  }

  console.log('Characters seeded: ZZZ and NIKKE');
};

module.exports = { seedInitialGames, seedInitialCharacters };
