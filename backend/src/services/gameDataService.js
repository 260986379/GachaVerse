const { query } = require("../config/db");

const ZZZ = {
  name: "Zenless Zone Zero",
  slug: "zenless-zone-zero",
  description:
    "A stylish action RPG set in New Eridu, humanity's last urban sanctuary against the supernatural Hollow invasion.",
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
    "Command a squad of Nikkes — humanoid weapons — to reclaim a post-apocalyptic world from alien invaders.",
  developer: "Shift Up",
  publisher: "Level Infinite",
  release_date: "2022-11-04",
  cover_image_url: "https://img.youtube.com/vi/6lRHrO2rfPA/maxresdefault.jpg",
  banner_image_url: "https://img.youtube.com/vi/6lRHrO2rfPA/maxresdefault.jpg",
  platforms: ["iOS", "Android", "PC"],
  genres: ["Shooter RPG", "Gacha"],
};

const CDN_ZZZ =
  "https://act-webstatic.hoyoverse.com/game_record/zzz/role_square_avatar/role_square_avatar_";
const CDN_NIKKE = "https://nikke.fandom.com/wiki/Special:Redirect/file/";

const ZZZ_CHARACTERS = [
  {
    name: "Belle",
    rarity: "SSR",
    element_type: "Ether",
    faction: "Main Character",
    icon_url: "/characters/zzz/Agent_Belle_Icon.webp",
    splash_art_urls: [
      "/characters/zzz/belle/Agent_Belle_Portrait.webp",
      "/characters/zzz/belle/Agent_Belle_Delicate_Sunlight_Portrait.webp",
      "/characters/zzz/belle/Agent_Belle_Summer_Skies_Portrait.webp",
    ],
    description:
      "The Proxy of New Eridu — resourceful, adaptable, and drawn into conflicts far larger than any one Hollow.",
  },
  {
    name: "Wise",
    rarity: "SSR",
    element_type: "Ether",
    faction: "Main Character",
    icon_url: "/characters/zzz/Agent_Wise_Icon.webp",
    description:
      "The male Proxy of New Eridu — calm under pressure and drawn into the same conflicts as his counterpart Belle.",
  },
  {
    name: "Ellen Joe",
    rarity: "SSR",
    element_type: "Ice",
    faction: "Victoria Housekeeping",
    icon_url: "/characters/zzz/Agent_Ellen_Joe_Icon.webp",
    description:
      "A celebrated idol by day, a razor-sharp fighter by night. Ellen commands ice with effortless precision.",
  },
  {
    name: "Von Lycaon",
    rarity: "SSR",
    element_type: "Ice",
    faction: "Victoria Housekeeping",
    icon_url: `${CDN_ZZZ}1101.png`,
    description:
      "Victoria Housekeeping's impeccably mannered butler conceals a wolf's ferocity beneath a polished exterior.",
  },
  {
    name: "Soldier 11",
    rarity: "SSR",
    element_type: "Fire",
    faction: "Victoria Housekeeping",
    icon_url: `${CDN_ZZZ}1061.png`,
    description:
      "A Victoria Housekeeping operative of few words and massive impact, greatsword blazing with every strike.",
  },
  {
    name: "Hoshimi Miyabi",
    rarity: "SSR",
    element_type: "Ice",
    faction: "H.S.O.S. 6",
    icon_url: "/characters/zzz/Agent_Hoshimi_Miyabi_Icon.webp",
    description:
      "New Eridu's youngest Void Hunter. Miyabi moves through the Hollow with an elegance that belies her lethality.",
  },
  {
    name: "Nicole",
    rarity: "SR",
    element_type: "Ether",
    faction: "Cunning Hares",
    icon_url: "/characters/zzz/Agent_Nicole_Demara_Icon.webp",
    description:
      "Leader of the Cunning Hares. Sharp instincts and a gambler's nerve make her one of New Eridu's best fixers.",
  },
  {
    name: "Anby Demara",
    rarity: "SR",
    element_type: "Electric",
    faction: "Cunning Hares",
    icon_url: "/characters/zzz/Agent_Anby_Demara_Icon.webp",
    description:
      "A lightning-fast swordswoman of the Cunning Hares who lets her blade do the talking in every battle.",
  },
  {
    name: "Billy Kid",
    rarity: "SR",
    element_type: "Physical",
    faction: "Cunning Hares",
    icon_url: "/characters/zzz/Agent_Billy_Kid_Icon.webp",
    description:
      "A sharpshooting gunslinger of the Cunning Hares whose quick draw and steady aim are the stuff of legend.",
  },
  {
    name: "Burnice White",
    rarity: "SSR",
    element_type: "Fire",
    faction: "Sons of Calydon",
    icon_url: "/characters/zzz/Agent_Burnice_White_Icon.webp",
    description:
      "A Sons of Calydon member who wields a flamethrower with reckless joy, turning every fight into a bonfire.",
  },
  {
    name: "Rina",
    rarity: "SSR",
    element_type: "Electric",
    faction: "Sons of Calydon",
    icon_url: `${CDN_ZZZ}1081.png`,
    description:
      "A doll-like performer who orchestrates battles through her twin marionette partners, Drusilla and Anastella.",
  },
  {
    name: "Zhu Yuan",
    rarity: "SSR",
    element_type: "Ether",
    faction: "Criminal Investigation",
    icon_url: `${CDN_ZZZ}1141.png`,
    description:
      "A sharp-witted Special Response officer who cuts through Hollows — and red tape — with equal efficiency.",
  },
  {
    name: "Jane Doe",
    rarity: "SSR",
    element_type: "Physical",
    faction: "Criminal Investigation",
    icon_url: "/characters/zzz/Agent_Jane_Doe_Icon.webp",
    description:
      "A Special Investigation operative who obscures her identity as effectively as she dismantles her targets.",
  },
  {
    name: "Ye Shunguang",
    rarity: "SSR",
    element_type: "Ice",
    faction: "Criminal Investigation",
    icon_url: "/characters/zzz/Agent_Ye_Shunguang_Icon.webp",
    description:
      "A disciplined warrior whose mastery of ice elemental combat commands respect on every battlefield.",
  },
  {
    name: "Soukaku",
    rarity: "SR",
    element_type: "Ice",
    faction: "Hollow Research Commission",
    icon_url: `${CDN_ZZZ}1021.png`,
    description:
      "A miko from the Hollow Research Commission who channels ancient wind and ice arts into devastating assaults.",
  },
  {
    name: "Yixuan",
    rarity: "SSR",
    element_type: "Ether",
    faction: "Hollow Research Commission",
    icon_url: "/characters/zzz/Agent_Yixuan_Icon.webp",
    description:
      "A graceful yet formidable agent who channels ether energy into every calculated strike.",
  },
  {
    name: "Promeia",
    rarity: "SSR",
    element_type: "Ice",
    faction: "Independent",
    icon_url: "/characters/zzz/Agent_Promeia_Icon.webp",
    description:
      "An enigmatic agent whose icy composure and precise technique make her a formidable force in any operation.",
  },
];

const NIKKE_CHARACTERS = [
  {
    name: "Rapi",
    rarity: "SSR",
    element_type: "Electric",
    faction: "Counters",
    icon_url: `${CDN_NIKKE}Rapi_icon.png`,
    description:
      "Squad leader of Counters. Stoic and decisive, Rapi shoulders the mission with iron resolve.",
  },
  {
    name: "Anis",
    rarity: "SR",
    element_type: "Electric",
    faction: "Counters",
    icon_url: `${CDN_NIKKE}Anis_icon.png`,
    description:
      "The squad's explosive wildcard. Anis charges into every battle with a grin and an oversized hammer.",
  },
  {
    name: "Neon",
    rarity: "SR",
    element_type: "Fire",
    faction: "Counters",
    icon_url: `${CDN_NIKKE}Neon_icon.png`,
    description:
      "Self-declared treasure hunter and the squad's fastest runner — especially when profit is involved.",
  },
  {
    name: "Blanc",
    rarity: "SSR",
    element_type: "Water",
    faction: "Elysion",
    icon_url: `${CDN_NIKKE}Blanc_icon.png`,
    description:
      "One half of a synchronized duo. Blanc's calm tactical mind complements her partner Noir perfectly.",
  },
  {
    name: "Yuni",
    rarity: "SR",
    element_type: "Wind",
    faction: "Elysion",
    icon_url: `${CDN_NIKKE}Yuni_icon.png`,
    description:
      "The gentle heart of the squad. Yuni fights to protect every life, no matter how small.",
  },
  {
    name: "Alice",
    rarity: "SSR",
    element_type: "Electric",
    faction: "Missilis Industry",
    icon_url: `${CDN_NIKKE}Alice_icon.png`,
    description:
      "A Nikke who perceives the world through her own peculiar logic, inspired by a story of a white rabbit.",
  },
  {
    name: "Modernia",
    rarity: "SSR",
    element_type: "Fire",
    faction: "Pilgrim",
    icon_url: `${CDN_NIKKE}Modernia_icon.png`,
    description:
      "One of the four Nikkes of the Apocalypse. Modernia's minigun pours out firepower at a terrifying scale.",
  },
  {
    name: "Scarlet",
    rarity: "SSR",
    element_type: "Fire",
    faction: "Pilgrim",
    icon_url: `${CDN_NIKKE}Scarlet_icon.png`,
    description:
      "Called the Black Hurricane, Scarlet is a legendary Nikke whose relentless blade leaves no opening.",
  },
];

const seedInitialGames = async () => {
  const existing = await query("SELECT COUNT(*) FROM games");
  if (parseInt(existing.rows[0].count) > 0) return;

  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      ZZZ.name,
      ZZZ.slug,
      ZZZ.description,
      ZZZ.developer,
      ZZZ.publisher,
      ZZZ.release_date,
      ZZZ.cover_image_url,
      ZZZ.banner_image_url,
      ZZZ.platforms,
      ZZZ.genres,
    ],
  );

  await query(
    `INSERT INTO games (name, slug, description, developer, publisher, release_date, cover_image_url, banner_image_url, platforms, genres)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      NIKKE.name,
      NIKKE.slug,
      NIKKE.description,
      NIKKE.developer,
      NIKKE.publisher,
      NIKKE.release_date,
      NIKKE.cover_image_url,
      NIKKE.banner_image_url,
      NIKKE.platforms,
      NIKKE.genres,
    ],
  );

  console.log("Games seeded: ZZZ and NIKKE");
};

const seedInitialCharacters = async () => {
  const { rows } = await query(
    "SELECT id, slug FROM games WHERE slug IN ($1, $2)",
    ["zenless-zone-zero", "nikke"],
  );
  const gameMap = Object.fromEntries(rows.map((r) => [r.slug, r.id]));

  const toSeed = [
    { slug: "zenless-zone-zero", characters: ZZZ_CHARACTERS },
    { slug: "nikke", characters: NIKKE_CHARACTERS },
  ];

  for (const { slug, characters } of toSeed) {
    const gameId = gameMap[slug];
    if (!gameId) continue;

    const { rows: existing } = await query(
      "SELECT COUNT(*) FROM characters WHERE game_id=$1",
      [gameId],
    );
    if (parseInt(existing[0].count) > 0) continue;

    for (const char of characters) {
      await query(
        `INSERT INTO characters (game_id, name, rarity, element_type, faction, description, icon_url, splash_art_urls)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [gameId, char.name, char.rarity, char.element_type, char.faction, char.description, char.icon_url, char.splash_art_urls || null],
      );
    }
    console.log(`Characters seeded for ${slug}`);
  }
};

const ZZZ_VIDEOS = [
  {
    external_id: "KGOynaQoofc",
    title: "Zenless Zone Zero Official Release Teaser",
    description: "Act One, Scene One!",
    published_at: "2024-07-04T00:00:00Z",
    video_type: "Trailer",
  },
  {
    external_id: "CdcdfFs9t1s",
    title: 'Lore Teaser - "Where the Miracle Began"',
    description:
      "We can put an end to evil and split the heavens. We can walk out of the fog and step closer to the truth... This is our nation, forever standing tall, and with the power to accomplish miracles.",
    published_at: "2024-05-15T00:00:00Z",
    video_type: "Trailer",
  },
  {
    external_id: "L5DEAV17cYY",
    title: 'Season 3 Teaser - "Before the Wind Rises"',
    description:
      "I've walked away from my past, but it still follows my every step.",
    published_at: "2024-05-15T00:00:00Z",
    video_type: "Trailer",
  },
  {
    external_id: "uuuE2e5tPDE",
    title: '"New Eridus Curtain Never Falls"',
    description:
      "This video may contain spoilers. Please watch at your own discretion.",
    published_at: "2024-06-20T00:00:00Z",
    video_type: "Cinematic",
  },
  {
    external_id: "WGVdfGbpq8c",
    title: 'Hoshimi Miyabi Character Teaser - "Rise of the Void Hunter"',
    description: "New Eridus youngest Void Hunter has emerged.",
    published_at: "2024-08-14T00:00:00Z",
    video_type: "Character Demo",
  },
  {
    external_id: "Tb21nggwBo4",
    title: 'Lucia EP - "DAMIDAMI"',
    description: "I ring my bell, I ring my bell. Counting sheep on my bed.",
    published_at: "2024-08-14T00:00:00Z",
    video_type: "Music",
  },
];

const NIKKE_VIDEOS = [
  {
    external_id: "6lRHrO2rfPA",
    title: "NIKKE: Goddess of Victory — Official Launch Trailer",
    description: "Humanity's last hope. The Nikkes stand ready.",
    published_at: "2022-11-04T00:00:00Z",
    video_type: "Trailer",
  },
  {
    external_id: "ztPIEFPMzC8",
    title: 'NIKKE — "Overzone" Story Trailer',
    description: "The battle for the surface reaches its climax.",
    published_at: "2023-06-01T00:00:00Z",
    video_type: "Cinematic",
  },
  {
    external_id: "KNb3MObHMeQ",
    title: "NIKKE — Character Trailer: Modernia",
    description: "One of the four Nikkes of the Apocalypse awakens.",
    published_at: "2023-03-10T00:00:00Z",
    video_type: "Character Demo",
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

// Demo news articles — placeholder tweets pointing to official accounts.
// Real tweet IDs will populate automatically once TWITTER_BEARER_TOKEN is set.
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

  for (const v of ZZZ_VIDEOS) {
    await query(
      `INSERT INTO media_content (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,FALSE,'published',$8)
       ON CONFLICT (external_id) DO NOTHING`,
      [
        gameMap["zenless-zone-zero"],
        v.title,
        v.description,
        v.external_id,
        `https://www.youtube.com/watch?v=${v.external_id}`,
        `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`,
        v.published_at,
        v.video_type,
      ],
    );
  }

  for (const v of NIKKE_VIDEOS) {
    await query(
      `INSERT INTO media_content (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,FALSE,'published',$8)
       ON CONFLICT (external_id) DO NOTHING`,
      [
        gameMap["nikke"],
        v.title,
        v.description,
        v.external_id,
        `https://www.youtube.com/watch?v=${v.external_id}`,
        `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`,
        v.published_at,
        v.video_type,
      ],
    );
  }

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
  await seedInitialCharacters();
  await seedNewsAndMedia();

  const { rows } = await query(
    "SELECT id, slug FROM games WHERE slug IN ($1,$2)",
    ["zenless-zone-zero", "nikke"],
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
  seedInitialCharacters,
  ensureInitialGameAndIngestionLogs,
};
