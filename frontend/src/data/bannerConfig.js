// Current and upcoming banners for all tracked games.
// Keep in sync with backend/src/config/bannerConfig.js each patch cycle.
// NewsFeedTab uses this as the display source; the API/DB layer overrides it
// once a game is fully seeded in the database.

const BANNER_CONFIG = {
  'zenless-zone-zero': [
    { name: 'Cold Rain Wanes in the Night (Promeia)', banner_type: 'Character', starts_at: '2026-05-06T06:00:00Z', ends_at: '2026-05-27T14:59:00Z', image_url: '/zzz-banners/PromeiaBanner.png' },
    { name: 'Wandering Night Lantern (Lucia)',         banner_type: 'Character', starts_at: '2026-05-06T06:00:00Z', ends_at: '2026-05-27T14:59:00Z', image_url: '/zzz-banners/LuciaBanner.png' },
    { name: 'Starlight, Shine Bright (SP Billy)',      banner_type: 'Character', starts_at: '2026-05-27T06:00:00Z', ends_at: '2026-06-16T14:59:00Z', image_url: '/zzz-banners/StarlightBillyBanner.png' },
    { name: 'Wrathborn Duo (Orphie & Magus)',          banner_type: 'Character', starts_at: '2026-05-27T06:00:00Z', ends_at: '2026-06-16T14:59:00Z', image_url: '/zzz-banners/OrphieBanner.png' },
  ],

  'nikke': [
    { name: 'Mint Special Recruit',         banner_type: 'Limited', starts_at: '2026-05-14T00:00:00Z', ends_at: '2026-06-04T23:59:00Z' },
    { name: 'EVE Limited-Time Recruitment', banner_type: 'Limited', starts_at: '2026-05-14T00:00:00Z', ends_at: '2026-06-04T23:59:00Z' },
    { name: 'Raven Limited-Time Recruitment', banner_type: 'Limited', starts_at: '2026-05-14T00:00:00Z', ends_at: '2026-06-04T23:59:00Z' },
  ],

  'genshin-impact': [
    { name: 'Nicole Character Event Wish', banner_type: 'Character', starts_at: '2026-05-20T18:00:00Z', ends_at: '2026-06-09T14:59:00Z' },
    { name: 'Durin Character Event Wish',  banner_type: 'Character', starts_at: '2026-05-20T18:00:00Z', ends_at: '2026-06-09T14:59:00Z' },
    { name: 'Weapon Event Wish',           banner_type: 'Weapon',    starts_at: '2026-05-20T18:00:00Z', ends_at: '2026-06-09T14:59:00Z' },
    { name: 'Lohen Character Event Wish',  banner_type: 'Character', starts_at: '2026-06-09T18:00:00Z', ends_at: '2026-06-30T14:59:00Z' },
    { name: 'Mavuika Character Event Wish',banner_type: 'Character', starts_at: '2026-06-09T18:00:00Z', ends_at: '2026-06-30T14:59:00Z' },
  ],

  'honkai-star-rail': [
    { name: 'Evanescia Character Warp',                     banner_type: 'Character', starts_at: '2026-05-13T12:00:00Z', ends_at: '2026-05-31T14:59:00Z' },
    { name: 'Indelible Coterie (Tribbie, Sunday, Feixiao)', banner_type: 'Character', starts_at: '2026-05-13T12:00:00Z', ends_at: '2026-05-31T14:59:00Z' },
    { name: 'Brilliant Fixation Light Cone Warp',           banner_type: 'Weapon',    starts_at: '2026-05-13T12:00:00Z', ends_at: '2026-05-31T14:59:00Z' },
    { name: 'Mortenax Blade Character Warp',                banner_type: 'Character', starts_at: '2026-05-31T12:00:00Z', ends_at: '2026-06-19T14:59:00Z' },
    { name: 'Yao Guang Character Warp',                     banner_type: 'Character', starts_at: '2026-05-31T12:00:00Z', ends_at: '2026-06-19T14:59:00Z' },
  ],

  'blue-archive': [
    { name: 'Kisaki Recruitment',      banner_type: 'Limited', starts_at: '2026-05-12T00:00:00Z', ends_at: '2026-05-26T23:59:00Z' },
    { name: 'Yuuka (Track) Recruitment', banner_type: 'Limited', starts_at: '2026-05-12T00:00:00Z', ends_at: '2026-05-26T23:59:00Z' },
    { name: 'Mari (Track) Recruitment', banner_type: 'Limited', starts_at: '2026-05-12T00:00:00Z', ends_at: '2026-05-26T23:59:00Z' },
    { name: 'Rio (Armed) Recruitment',  banner_type: 'Limited', starts_at: '2026-05-26T00:00:00Z', ends_at: '2026-06-09T23:59:00Z' },
    { name: 'Himari (Armed) Recruitment', banner_type: 'Limited', starts_at: '2026-05-26T00:00:00Z', ends_at: '2026-06-09T23:59:00Z' },
  ],

  'arknights': [
    { name: 'Nasti Headhunting', banner_type: 'Limited', starts_at: '2026-05-21T08:00:00Z', ends_at: '2026-06-04T03:59:00Z' },
  ],

  'wuthering-waves': [
    { name: 'False Promise For Tomorrow (Denia)', banner_type: 'Character', starts_at: '2026-05-21T10:00:00Z', ends_at: '2026-06-07T11:59:00Z' },
    { name: 'Chisa & Phrolova Resonance Banners', banner_type: 'Character', starts_at: '2026-05-21T10:00:00Z', ends_at: '2026-06-07T11:59:00Z' },
  ],

  'reverse-1999': [
    { name: 'Her Heart-Cut Spring (Paper Heron)', banner_type: 'Limited',  starts_at: '2026-04-16T00:00:00Z', ends_at: '2026-05-28T23:59:00Z' },
    { name: 'The Snow of Dushuo',                 banner_type: 'Standard', starts_at: '2026-04-04T00:00:00Z', ends_at: '2026-05-28T23:59:00Z' },
  ],

  'limbus-company': [
    { name: 'Blade of the House of Spiders Ryōshū Extraction', banner_type: 'Limited', starts_at: '2026-05-14T12:00:00Z', ends_at: '2026-05-28T10:00:00Z' },
    { name: 'Nursefather Outis Identity Extraction',            banner_type: 'Limited', starts_at: '2026-05-28T00:00:00Z', ends_at: '2026-06-11T23:59:00Z' },
  ],
};

export default BANNER_CONFIG;
