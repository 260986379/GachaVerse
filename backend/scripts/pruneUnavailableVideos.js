/**
 * Check all published YouTube videos against the YouTube Data API and mark
 * any that are unavailable (privated, deleted, etc.) with status='unavailable'.
 * Those rows are already filtered out by the media API (WHERE status='published').
 *
 * Usage:
 *   node scripts/pruneUnavailableVideos.js [gameSlug]
 *
 * With no argument, checks every game. Pass a slug to limit to one game:
 *   node scripts/pruneUnavailableVideos.js genshin-impact
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');
const config = require('../src/config');

const BATCH = 50; // YouTube API max per videos.list call

const checkBatch = async (ids) => {
  const params = new URLSearchParams({
    part: 'id',
    id: ids.join(','),
    key: config.YOUTUBE_API_KEY,
    maxResults: BATCH,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return new Set((data.items || []).map((i) => i.id));
};

const main = async () => {
  const gameSlug = process.argv[2] || null;

  await testConnection();

  let dbQuery, dbParams;
  if (gameSlug) {
    dbQuery = `
      SELECT mc.id, mc.external_id, g.slug
      FROM media_content mc
      JOIN games g ON g.id = mc.game_id
      WHERE mc.external_platform = 'YouTube'
        AND mc.status = 'published'
        AND g.slug = $1
      ORDER BY mc.published_at DESC
    `;
    dbParams = [gameSlug];
  } else {
    dbQuery = `
      SELECT mc.id, mc.external_id, g.slug
      FROM media_content mc
      JOIN games g ON g.id = mc.game_id
      WHERE mc.external_platform = 'YouTube'
        AND mc.status = 'published'
      ORDER BY mc.published_at DESC
    `;
    dbParams = [];
  }

  const { rows } = await query(dbQuery, dbParams);
  console.log(`Checking ${rows.length} published YouTube video(s)…`);

  const unavailable = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const ids = batch.map((r) => r.external_id);
    const available = await checkBatch(ids);

    for (const row of batch) {
      if (!available.has(row.external_id)) {
        unavailable.push(row);
        console.log(`  [unavailable] ${row.external_id}  (${row.slug})`);
      }
    }
  }

  if (!unavailable.length) {
    console.log('All videos are available — nothing to update.');
    return;
  }

  const ids = unavailable.map((r) => r.id);
  await query(
    `UPDATE media_content SET status='unavailable' WHERE id = ANY($1)`,
    [ids]
  );
  console.log(`Marked ${ids.length} video(s) as unavailable.`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
