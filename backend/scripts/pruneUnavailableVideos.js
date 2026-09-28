/**
 * Check all published YouTube videos against the YouTube Data API and mark
 * any that are unavailable (privated, deleted, rejected, embedding disabled)
 * with status='unavailable'.
 * Those rows are already filtered out by the media API (WHERE status='published').
 *
 * Usage:
 *   node scripts/pruneUnavailableVideos.js [gameSlug] [--dry-run]
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
    part: 'status',
    id: ids.join(','),
    key: config.YOUTUBE_API_KEY,
    maxResults: BATCH,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  // Private and deleted videos are simply absent from the response
  return new Set(
    (data.items || [])
      .filter((i) => i.status?.embeddable !== false && ['processed', 'uploaded'].includes(i.status?.uploadStatus))
      .map((i) => i.id)
  );
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const gameSlug = args.find((a) => !a.startsWith('--')) || null;

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

  if (dryRun) {
    console.log(`[dry-run] Would mark ${unavailable.length} video(s) as unavailable.`);
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
