require('dotenv').config();
const { pool, query } = require('../src/config/db');

const ZZZ_LORE_VIDEOS = [
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
];

const seedLoreVideos = async () => {
  const { rows } = await query(`SELECT id FROM games WHERE slug = 'zenless-zone-zero'`);
  const gameId = rows[0].id;

  for (const v of ZZZ_LORE_VIDEOS) {
    const { rowCount } = await query(
      `INSERT INTO media_content (game_id, title, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,'YouTube',$3,$4,$5,$6,FALSE,'published','Lore')
       ON CONFLICT (external_id) DO NOTHING`,
      [
        gameId,
        v.title,
        v.external_id,
        `https://www.youtube.com/watch?v=${v.external_id}`,
        `https://img.youtube.com/vi/${v.external_id}/hqdefault.jpg`,
        v.published_at,
      ]
    );
    console.log(`${rowCount ? 'Inserted' : 'Already exists'}: ${v.title}`);
  }
};

if (require.main === module) {
  seedLoreVideos().then(() => pool.end()).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { seedLoreVideos };
