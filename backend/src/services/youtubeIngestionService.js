const { query } = require('../config/db');
const config = require('../config');

// Fetches recent videos from a YouTube channel and stores new ones in media_content.
// Requires a valid YOUTUBE_API_KEY in .env — skips gracefully with a placeholder.
const ingestVideosForGame = async (gameSlug, channelId) => {
  if (config.YOUTUBE_API_KEY.startsWith('PLACEHOLDER')) {
    console.log(`[YouTube] Skipping ingestion for channel ${channelId} — no real API key set.`);
    return;
  }

  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', [gameSlug]);
  if (!gameRows.length) return;
  const gameId = gameRows[0].id;

  // YouTube Data API v3 — search for uploads from the channel
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    order: 'date',
    type: 'video',
    maxResults: '10',
    key: config.YOUTUBE_API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!res.ok) {
    console.error(`[YouTube] API error for channel ${channelId}:`, res.status, await res.text());
    return;
  }

  const data = await res.json();
  const items = data.items || [];
  if (!items.length) return;

  for (const item of items) {
    const videoId = item.id.videoId;
    const { snippet } = item;
    const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '';

    await query(
      `INSERT INTO media_content (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, is_automated, status, category)
       VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,TRUE,'published','Video')
       ON CONFLICT (external_id) DO NOTHING`,
      [gameId, snippet.title, snippet.description, videoId, sourceUrl, thumbnailUrl, snippet.publishedAt]
    );
  }

  await query(
    `INSERT INTO ingestion_logs (game_id, platform, last_run_at, status)
     VALUES ($1,'YouTube',NOW(),'success')
     ON CONFLICT (game_id, platform) DO UPDATE SET last_run_at=NOW(), status='success'`,
    [gameId]
  );

  console.log(`[YouTube] Ingested ${items.length} video(s) for channel ${channelId}`);
};

const runYouTubeIngestion = async () => {
  try {
    await ingestVideosForGame('zenless-zone-zero', config.ZZZ_YOUTUBE_CHANNEL_ID);
    await ingestVideosForGame('nikke', config.NIKKE_YOUTUBE_CHANNEL_ID);
  } catch (err) {
    console.error('[YouTube] Ingestion error:', err.message);
  }
};

module.exports = { runYouTubeIngestion };
