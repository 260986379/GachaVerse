require('dotenv').config();
const { pool, query } = require('../src/config/db');

const LORE_VIDEOS = {
  'zenless-zone-zero': [
    {
      external_id: 'UgeN7naPPz4',
      title: 'Lore Teaser - "Where the Miracle Began"',
      published_at: '2024-07-06T03:59:24Z',
    },
    {
      external_id: 'Sq9VtAEBTcM',
      title: 'The Three-Pronged Pact',
      published_at: '2026-03-14T12:15:08Z',
    },
  ],
  'nikke': [
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
  ],
};

const seedLoreVideos = async () => {
  for (const [gameSlug, videos] of Object.entries(LORE_VIDEOS)) {
    const { rows } = await query(`SELECT id FROM games WHERE slug = $1`, [gameSlug]);
    if (!rows.length) { console.warn(`Game not found: ${gameSlug}`); continue; }
    const gameId = rows[0].id;

    for (const v of videos) {
      const { rowCount } = await query(
        `INSERT INTO media_content (game_id, title, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
         VALUES ($1,$2,'YouTube',$3,$4,$5,$6,FALSE,'published','Lore')
         ON CONFLICT (external_id) DO UPDATE SET status='published', category='Lore'`,
        [
          gameId,
          v.title,
          v.external_id,
          `https://www.youtube.com/watch?v=${v.external_id}`,
          `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`,
          v.published_at,
        ]
      );
      console.log(`[${gameSlug}] ${rowCount ? 'Upserted' : 'No change'}: ${v.title}`);
    }
  }
};

if (require.main === module) {
  seedLoreVideos().then(() => pool.end()).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { seedLoreVideos };
