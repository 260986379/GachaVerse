// Static banner data for all tracked games.
// Update this file each patch cycle (~every 3–6 weeks per game).
// The banner sync service reads this on startup and every 6 hours,
// inserting new entries. Expired banners drop out automatically via ends_at > NOW().
//
// banner_type values: "Character" | "Weapon" | "Limited" | "Bangboo" | "Standard"
//   Character — named character limited banner (HoYoverse, Wuthering Waves)
//   Weapon    — weapon / W-Engine / Light Cone banner
//   Limited   — generic limited pull (NIKKE, Arknights, Blue Archive, etc.)
//   Standard  — permanent / non-limited banner
//   Bangboo   — ZZZ Bangboo-specific pool

module.exports = {
  // ── Zenless Zone Zero ──────────────────────────────────────────────────────
  // Version 1.6  Phase 1: May 6 – May 27  |  Phase 2: May 27 – Jun 16
  'zenless-zone-zero': [
    {
      name: 'Cold Rain Wanes in the Night (Promeia)',
      type: 'Character',
      starts_at: '2026-05-06T06:00:00Z',
      ends_at:   '2026-05-27T14:59:00Z',
    },
    {
      name: 'Wandering Night Lantern (Lucia)',
      type: 'Character',
      starts_at: '2026-05-06T06:00:00Z',
      ends_at:   '2026-05-27T14:59:00Z',
    },
    {
      name: 'Starlight, Shine Bright (SP Billy)',
      type: 'Character',
      starts_at: '2026-05-27T06:00:00Z',
      ends_at:   '2026-06-16T14:59:00Z',
    },
    {
      name: 'Wrathborn Duo (Orphie & Magus)',
      type: 'Character',
      starts_at: '2026-05-27T06:00:00Z',
      ends_at:   '2026-06-16T14:59:00Z',
    },
  ],

  // ── NIKKE: Goddess of Victory ──────────────────────────────────────────────
  // May 14 – Jun 4 update banners
  'nikke': [
    {
      name: 'Mint Special Recruit',
      type: 'Limited',
      starts_at: '2026-05-14T00:00:00Z',
      ends_at:   '2026-06-04T23:59:00Z',
    },
    {
      name: 'EVE Limited-Time Recruitment',
      type: 'Limited',
      starts_at: '2026-05-14T00:00:00Z',
      ends_at:   '2026-06-04T23:59:00Z',
    },
    {
      name: 'Raven Limited-Time Recruitment',
      type: 'Limited',
      starts_at: '2026-05-14T00:00:00Z',
      ends_at:   '2026-06-04T23:59:00Z',
    },
  ],

  // ── Genshin Impact ─────────────────────────────────────────────────────────
  // Version 5.8  Phase 1: May 20 – Jun 9  |  Phase 2: Jun 9 – Jun 30
  'genshin-impact': [
    {
      name: 'Nicole Character Event Wish',
      type: 'Character',
      starts_at: '2026-05-20T18:00:00Z',
      ends_at:   '2026-06-09T14:59:00Z',
    },
    {
      name: 'Durin Character Event Wish',
      type: 'Character',
      starts_at: '2026-05-20T18:00:00Z',
      ends_at:   '2026-06-09T14:59:00Z',
    },
    {
      name: 'Weapon Event Wish',
      type: 'Weapon',
      starts_at: '2026-05-20T18:00:00Z',
      ends_at:   '2026-06-09T14:59:00Z',
    },
    {
      name: 'Lohen Character Event Wish',
      type: 'Character',
      starts_at: '2026-06-09T18:00:00Z',
      ends_at:   '2026-06-30T14:59:00Z',
    },
    {
      name: 'Mavuika Character Event Wish',
      type: 'Character',
      starts_at: '2026-06-09T18:00:00Z',
      ends_at:   '2026-06-30T14:59:00Z',
    },
  ],

  // ── Honkai: Star Rail ──────────────────────────────────────────────────────
  // Version 3.4  Phase 2: May 13 – May 31  |  Phase 3: May 31 – Jun 19
  'honkai-star-rail': [
    {
      name: 'Evanescia Character Warp',
      type: 'Character',
      starts_at: '2026-05-13T12:00:00Z',
      ends_at:   '2026-05-31T14:59:00Z',
    },
    {
      name: 'Indelible Coterie (Tribbie, Sunday, Feixiao)',
      type: 'Character',
      starts_at: '2026-05-13T12:00:00Z',
      ends_at:   '2026-05-31T14:59:00Z',
    },
    {
      name: 'Brilliant Fixation Light Cone Warp',
      type: 'Weapon',
      starts_at: '2026-05-13T12:00:00Z',
      ends_at:   '2026-05-31T14:59:00Z',
    },
    {
      name: 'Mortenax Blade Character Warp',
      type: 'Character',
      starts_at: '2026-05-31T12:00:00Z',
      ends_at:   '2026-06-19T14:59:00Z',
    },
    {
      name: 'Yao Guang Character Warp',
      type: 'Character',
      starts_at: '2026-05-31T12:00:00Z',
      ends_at:   '2026-06-19T14:59:00Z',
    },
  ],

  // ── Blue Archive (Global) ──────────────────────────────────────────────────
  // May 12 – May 26  |  May 26 – Jun 9
  'blue-archive': [
    {
      name: 'Kisaki Recruitment',
      type: 'Limited',
      starts_at: '2026-05-12T00:00:00Z',
      ends_at:   '2026-05-26T23:59:00Z',
    },
    {
      name: 'Yuuka (Track) Recruitment',
      type: 'Limited',
      starts_at: '2026-05-12T00:00:00Z',
      ends_at:   '2026-05-26T23:59:00Z',
    },
    {
      name: 'Mari (Track) Recruitment',
      type: 'Limited',
      starts_at: '2026-05-12T00:00:00Z',
      ends_at:   '2026-05-26T23:59:00Z',
    },
    {
      name: 'Rio (Armed) Recruitment',
      type: 'Limited',
      starts_at: '2026-05-26T00:00:00Z',
      ends_at:   '2026-06-09T23:59:00Z',
    },
    {
      name: 'Himari (Armed) Recruitment',
      type: 'Limited',
      starts_at: '2026-05-26T00:00:00Z',
      ends_at:   '2026-06-09T23:59:00Z',
    },
  ],

  // ── Arknights (Global) ─────────────────────────────────────────────────────
  // May 21 – Jun 4
  'arknights': [
    {
      name: 'Nasti Headhunting',
      type: 'Limited',
      starts_at: '2026-05-21T08:00:00Z',
      ends_at:   '2026-06-04T03:59:00Z',
    },
  ],

  // ── Wuthering Waves ────────────────────────────────────────────────────────
  // Version 2.5  Phase 2: May 21 – Jun 7
  'wuthering-waves': [
    {
      name: 'False Promise For Tomorrow (Denia)',
      type: 'Character',
      starts_at: '2026-05-21T10:00:00Z',
      ends_at:   '2026-06-07T11:59:00Z',
    },
    {
      name: 'Chisa & Phrolova Resonance Banners',
      type: 'Character',
      starts_at: '2026-05-21T10:00:00Z',
      ends_at:   '2026-06-07T11:59:00Z',
    },
  ],

  // ── Reverse: 1999 ──────────────────────────────────────────────────────────
  // Version 3.4  ending May 28
  'reverse-1999': [
    {
      name: 'Her Heart-Cut Spring (Paper Heron)',
      type: 'Limited',
      starts_at: '2026-04-16T00:00:00Z',
      ends_at:   '2026-05-28T23:59:00Z',
    },
    {
      name: 'The Snow of Dushuo',
      type: 'Standard',
      starts_at: '2026-04-04T00:00:00Z',
      ends_at:   '2026-05-28T23:59:00Z',
    },
  ],

  // ── Limbus Company ─────────────────────────────────────────────────────────
  // Current ends May 28  |  Upcoming starts May 28
  'limbus-company': [
    {
      name: 'Blade of the House of Spiders Ryōshū Extraction',
      type: 'Limited',
      starts_at: '2026-05-14T12:00:00Z',
      ends_at:   '2026-05-28T10:00:00Z',
      image_url: 'https://commons.wiki.gg/images/Target_Extraction_-_Blade_of_the_House_of_Spiders_Ry%C5%8Dsh%C5%AB.png',
    },
    {
      name: 'Nursefather Outis Identity Extraction',
      type: 'Limited',
      starts_at: '2026-05-28T00:00:00Z',
      ends_at:   '2026-06-11T23:59:00Z',
    },
  ],
};
