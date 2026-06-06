/**
 * Fetch a single YouTube video by ID and insert it into media_content.
 * Useful for one-off videos that were skipped before a classifier rule existed.
 *
 * Usage:
 *   node scripts/ingestSingleVideo.js <videoId> <gameSlug>
 *
 * Example:
 *   node scripts/ingestSingleVideo.js _nJW1twvikw zenless-zone-zero
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');
const { classifyVideoTitle } = require('../src/services/videoClassifier');
const config = require('../src/config');

const decodeHtmlEntities = (str) =>
  str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const main = async () => {
  const [videoId, gameSlug] = process.argv.slice(2);
  if (!videoId || !gameSlug) {
    console.error('Usage: node scripts/ingestSingleVideo.js <videoId> <gameSlug>');
    process.exit(1);
  }

  await testConnection();

  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', [gameSlug]);
  if (!gameRows.length) {
    console.error(`Game not found in DB: ${gameSlug}`);
    process.exit(1);
  }
  const gameId = gameRows[0].id;

  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: videoId,
    key: config.YOUTUBE_API_KEY,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!res.ok) {
    console.error(`YouTube API error: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) {
    console.error(`Video not found on YouTube: ${videoId}`);
    process.exit(1);
  }

  const { snippet, statistics } = item;
  const title = decodeHtmlEntities(snippet.title || '');
  const description = decodeHtmlEntities(snippet.description || '');
  const category = classifyVideoTitle(gameSlug, title);

  console.log(`Title:    ${title}`);
  console.log(`Category: ${category ?? '(no match — would be skipped)'}`);

  if (!category) {
    console.error('No classifier rule matched. Add a rule in videoClassifier.js first.');
    process.exit(1);
  }

  const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl =
    snippet.thumbnails?.maxres?.url ||
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.default?.url ||
    '';
  const viewCount = parseInt(statistics?.viewCount || '0', 10);

  const { rowCount } = await query(
    `INSERT INTO media_content
       (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, category, is_automated, status, view_count)
     VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,$8,TRUE,'published',$9)
     ON CONFLICT (external_id) DO UPDATE
       SET category      = EXCLUDED.category,
           thumbnail_url = EXCLUDED.thumbnail_url,
           view_count    = EXCLUDED.view_count`,
    [gameId, title, description, videoId, sourceUrl, thumbnailUrl, snippet.publishedAt, category, viewCount]
  );

  console.log(rowCount ? `Inserted/updated successfully.` : `No rows affected.`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
