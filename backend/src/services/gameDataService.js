const { query } = require("../config/db");

const ZZZ = {
  name: "Zenless Zone Zero",
  slug: "zenless-zone-zero",
  description:
    "A stylish action RPG set in New Eridu, humanity's last urban sanctuary against the supernatural Hollow disaster.",
  developer: "HoYoverse",
  publisher: "HoYoverse",
  release_date: "2024-07-04",
  cover_image_url: "https://img.youtube.com/vi/L5DEAV17cYY/maxresdefault.jpg",
  banner_image_url: "https://img.youtube.com/vi/L5DEAV17cYY/maxresdefault.jpg",
  platforms: ["iOS", "Android", "PC", "PS5"],
  genres: ["Action RPG", "Gacha"],
};

const NIKKE = {
  name: "NIKKE: Goddess of Victory",
  slug: "nikke",
  description:
    "Command a squad of Nikkes — humanoid weapons — to reclaim a post-apocalyptic world from mechanical invaders.",
  developer: "Shift Up",
  publisher: "Level Infinite",
  release_date: "2022-11-04",
  cover_image_url: "https://img.youtube.com/vi/6lRHrO2rfPA/maxresdefault.jpg",
  banner_image_url: "https://img.youtube.com/vi/6lRHrO2rfPA/maxresdefault.jpg",
  platforms: ["iOS", "Android", "PC"],
  genres: ["Shooter RPG", "Gacha"],
};

const WW = {
  name: "Wuthering Waves",
  slug: "wuthering-waves",
  description:
    "An open-world action RPG with fast-paced combat in a post-apocalyptic world filled with mysterious Tacet Discords.",
  developer: "Kuro Games",
  publisher: "Kuro Games",
  release_date: "2024-05-22",
  cover_image_url: "https://img.youtube.com/vi/DrkE-mw2Nxg/maxresdefault.jpg",
  banner_image_url: "https://img.youtube.com/vi/DrkE-mw2Nxg/maxresdefault.jpg",
  platforms: ["iOS", "Android", "PC"],
  genres: ["Action RPG", "Gacha"],
};

const GENSHIN = {
  name: "Genshin Impact",
  slug: "genshin-impact",
  description:
    "An open-world action RPG set in the magical world of Teyvat. Explore vast landscapes across 7 elemental nations.",
  developer: "HoYoverse",
  publisher: "HoYoverse",
  release_date: "2020-09-28",
  cover_image_url: "https://img.youtube.com/vi/b8MsWzHvLXQ/maxresdefault.jpg",
  banner_image_url: "https://img.youtube.com/vi/b8MsWzHvLXQ/maxresdefault.jpg",
  platforms: ["iOS", "Android", "PC", "PS4", "PS5"],
  genres: ["Action RPG", "Gacha"],
};

const HSR = {
  name: "Honkai: Star Rail",
  slug: "honkai-star-rail",
  description:
    "Board a space station and embark on an intergalactic adventure across the stars in this turn-based RPG.",
  developer: "HoYoverse",
  publisher: "HoYoverse",
  release_date: "2023-04-26",
  cover_image_url: "https://img.youtube.com/vi/LkxwwIyXJxE/maxresdefault.jpg",
  banner_image_url: "https://img.youtube.com/vi/LkxwwIyXJxE/maxresdefault.jpg",
  platforms: ["iOS", "Android", "PC", "PS5"],
  genres: ["Turn-Based RPG", "Gacha"],
};

const SEED_GAMES = [ZZZ, NIKKE, GENSHIN, WW, HSR];

const seedInitialGames = async () => {
  for (const g of SEED_GAMES) {
    await query(
      `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (slug) DO NOTHING`,
      [g.name, g.slug, g.description, g.developer, g.publisher, g.release_date, g.cover_image_url, g.banner_image_url, g.platforms, g.genres],
    );
  }
  console.log(`Games seeded: ${SEED_GAMES.map((g) => g.name).join(', ')}`);
};

const ZZZ_LORE_VIDEOS = [
  {
    external_id: "UgeN7naPPz4",
    title: 'Lore Teaser - "Where the Miracle Began"',
    published_at: "2024-07-06T03:59:24Z",
    video_type: "Lore",
  },
  {
    external_id: "Sq9VtAEBTcM",
    title: "The Three-Pronged Pact",
    published_at: "2026-03-14T12:15:08Z",
    video_type: "Lore",
  },
];


const NIKKE_LORE_VIDEOS = [
  {
    external_id: 'yw9U2V1ZAJM',
    title: 'About the World',
    published_at: '2022-10-01T00:00:00Z',
  },
  {
    external_id: 'JjcR8wuWEC4',
    title: 'Official Trailer',
    published_at: '2022-11-04T00:00:00Z',
  },
];

const ZZZ_ART = [
  // Cover Art
  {
    external_id: "zzz-art-cover-1",
    title: "Chapter 1.1: Undercover R&B Tape",
    category: "Cover Art",
    path: "/art/zzz/cover-art/Chapter1.1_Undercover_RnB_Tape_Cover_Front.webp",
    published_at: "2024-07-10T00:00:00Z",
  },
  {
    external_id: "zzz-art-cover-2",
    title: "Chapter 1.3: Virtual Revenge Tape",
    category: "Cover Art",
    path: "/art/zzz/cover-art/Chapter1.3_Virtual_Revenge_Tape_Cover_Front.webp",
    published_at: "2024-07-20T00:00:00Z",
  },
  {
    external_id: "zzz-art-cover-3",
    title: "Chapter 4: Tour de Inferno",
    category: "Cover Art",
    path: "/art/zzz/cover-art/Chapter4_Tour_de_Inferno_Cover_Front.webp",
    published_at: "2024-09-01T00:00:00Z",
  },
  {
    external_id: "zzz-art-cover-4",
    title: "Chapter 5: A Storm of Falling Stars",
    category: "Cover Art",
    path: "/art/zzz/cover-art/Chapter5_A_Storm_of_Falling_Stars_Cover_Front.webp",
    published_at: "2024-11-01T00:00:00Z",
  },
  // Holiday Artwork
  {
    external_id: "zzz-art-holiday-1",
    title: "New Year 2023",
    category: "Holiday Artwork",
    path: "/art/zzz/holiday/New_Year_2023_Artwork.webp",
    published_at: "2023-01-01T00:00:00Z",
  },
  {
    external_id: "zzz-art-holiday-2",
    title: "Season of Renewal 2023",
    category: "Holiday Artwork",
    path: "/art/zzz/holiday/Season_of_Renewal_2023_Artwork.webp",
    published_at: "2023-02-01T00:00:00Z",
  },
  {
    external_id: "zzz-art-holiday-3",
    title: "Spring Festival 2024",
    category: "Holiday Artwork",
    path: "/art/zzz/holiday/Spring_Festival_2024_Artwork.webp",
    published_at: "2024-02-10T00:00:00Z",
  },
  {
    external_id: "zzz-art-holiday-4",
    title: "Valentine's Day 2024",
    category: "Holiday Artwork",
    path: "/art/zzz/holiday/Valentines_Day_2024_Artwork.webp",
    published_at: "2024-02-14T00:00:00Z",
  },
  // Wallpapers
  {
    external_id: "zzz-art-wallpaper-1",
    title: "Wallpaper Collection Vol. 1",
    category: "Wallpapers",
    path: "/art/zzz/wallpaper/Wallpaper_Collection_001_-_06.webp",
    published_at: "2024-07-05T00:00:00Z",
  },
  {
    external_id: "zzz-art-wallpaper-2",
    title: "Wallpaper Collection Vol. 2",
    category: "Wallpapers",
    path: "/art/zzz/wallpaper/Wallpaper_Collection_002_-_05.webp",
    published_at: "2024-07-12T00:00:00Z",
  },
  {
    external_id: "zzz-art-wallpaper-3",
    title: "Wallpaper Collection Vol. 3",
    category: "Wallpapers",
    path: "/art/zzz/wallpaper/Wallpaper_Collection_003_-_04.webp",
    published_at: "2024-07-19T00:00:00Z",
  },
  {
    external_id: "zzz-art-wallpaper-4",
    title: "Wallpaper Collection Vol. 4",
    category: "Wallpapers",
    path: "/art/zzz/wallpaper/Wallpaper_Collection_004_-_05.webp",
    published_at: "2024-08-01T00:00:00Z",
  },
  {
    external_id: "zzz-art-wallpaper-5",
    title: "Wallpaper Collection Vol. 5",
    category: "Wallpapers",
    path: "/art/zzz/wallpaper/Wallpaper_Collection_005_-_04.webp",
    published_at: "2024-08-15T00:00:00Z",
  },
];

const ZZZ_NEWS = [
  {
    title:
      "🎮 Zenless Zone Zero is now officially live! Download and step into New Eridu today. #ZenlessZoneZero",
    source_url: "https://twitter.com/ZenlessZoneZero",
    published_at: "2024-07-04T12:00:00Z",
  },
  {
    title:
      "⚡ Version 1.1 is here! New story chapters, Ellen Joe & Zhu Yuan banners, and more await. #ZZZ",
    source_url: "https://twitter.com/ZenlessZoneZero",
    published_at: "2024-08-14T10:00:00Z",
  },
  {
    title:
      "🌆 Explore the Districts of New Eridu in Zenless Zone Zero. Each zone hides secrets waiting to be uncovered.",
    source_url: "https://twitter.com/ZenlessZoneZero",
    published_at: "2024-06-25T14:00:00Z",
  },
];

const NIKKE_NEWS = [
  {
    title:
      "🚀 NIKKE: Goddess of Victory global launch is LIVE! Join the resistance and reclaim the surface. #NIKKE",
    source_url: "https://twitter.com/NIKKE_en",
    published_at: "2022-11-04T12:00:00Z",
  },
  {
    title:
      "🔥 New event: Overzone — the battle for the surface intensifies. Log in and fight alongside your Nikkes!",
    source_url: "https://twitter.com/NIKKE_en",
    published_at: "2023-06-01T10:00:00Z",
  },
  {
    title:
      "💥 SSR Modernia is available in the new banner! Don't miss your chance to add her to your squad. #NIKKE",
    source_url: "https://twitter.com/NIKKE_en",
    published_at: "2023-03-10T14:00:00Z",
  },
];

const seedNewsAndMedia = async () => {
  const { rows } = await query(
    "SELECT id, slug FROM games WHERE slug IN ($1,$2)",
    ["zenless-zone-zero", "nikke"],
  );
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  for (const v of ZZZ_LORE_VIDEOS) {
    await query(
      `INSERT INTO media_content (game_id, title, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,'YouTube',$3,$4,$5,$6,FALSE,'published',$7)
       ON CONFLICT (external_id) DO UPDATE SET status='published', category=EXCLUDED.category`,
      [
        gameMap["zenless-zone-zero"],
        v.title,
        v.external_id,
        `https://www.youtube.com/watch?v=${v.external_id}`,
        `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`,
        v.published_at,
        v.video_type,
      ],
    );
  }

  for (const v of NIKKE_LORE_VIDEOS) {
    await query(
      `INSERT INTO media_content (game_id, title, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,'YouTube',$3,$4,$5,$6,FALSE,'published','Lore')
       ON CONFLICT (external_id) DO UPDATE SET status='published', category='Lore'`,
      [
        gameMap['nikke'],
        v.title,
        v.external_id,
        `https://www.youtube.com/watch?v=${v.external_id}`,
        `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`,
        v.published_at,
      ],
    );
  }

  // Remove old hardcoded NIKKE demo videos — YouTube ingestion handles these now
  await query(
    `DELETE FROM media_content WHERE external_id = ANY($1) AND is_automated = FALSE`,
    [['6lRHrO2rfPA', 'ztPIEFPMzC8', 'KNb3MObHMeQ']],
  );

  for (const a of ZZZ_ART) {
    await query(
      `INSERT INTO media_content (game_id, title, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,'Local',$3,$4,$4,$5,FALSE,'published',$6)
       ON CONFLICT (external_id) DO NOTHING`,
      [
        gameMap["zenless-zone-zero"],
        a.title,
        a.external_id,
        a.path,
        a.published_at,
        a.category,
      ],
    );
  }

  for (const n of ZZZ_NEWS) {
    await query(
      `INSERT INTO news_articles (game_id, title, external_platform, source_url, published_at, is_automated, status)
       VALUES ($1,$2,'TwitterX',$3,$4,FALSE,'published')`,
      [gameMap["zenless-zone-zero"], n.title, n.source_url, n.published_at],
    );
  }

  for (const n of NIKKE_NEWS) {
    await query(
      `INSERT INTO news_articles (game_id, title, external_platform, source_url, published_at, is_automated, status)
       VALUES ($1,$2,'TwitterX',$3,$4,FALSE,'published')`,
      [gameMap["nikke"], n.title, n.source_url, n.published_at],
    );
  }

  console.log("Demo news and media seeded for ZZZ and NIKKE");
};

const ensureInitialGameAndIngestionLogs = async () => {
  await seedInitialGames();
  await seedNewsAndMedia();

  const slugs = SEED_GAMES.map((g) => g.slug);
  const { rows } = await query(
    'SELECT id, slug FROM games WHERE slug = ANY($1)',
    [slugs],
  );
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  for (const [slug, gameId] of Object.entries(gameMap)) {
    for (const platform of ["TwitterX", "YouTube"]) {
      await query(
        `INSERT INTO ingestion_logs (game_id, platform, status) VALUES ($1,$2,'pending')
         ON CONFLICT (game_id, platform) DO NOTHING`,
        [gameId, platform],
      );
    }
  }
};

module.exports = {
  seedInitialGames,
  ensureInitialGameAndIngestionLogs,
};
