const { query } = require('../config/db');
const config = require('../config');
const { classifyVideoTitle } = require('./videoClassifier');

const ingestVideosForGame = async (gameSlug, channelId) => {
  if (!channelId || channelId.startsWith('PLACEHOLDER')) {
    console.log(`[YouTube] Skipping ingestion for ${gameSlug} — channel ID not configured.`);
    return;
  }

  if (config.YOUTUBE_API_KEY.startsWith('PLACEHOLDER')) {
    console.log(`[YouTube] Skipping ingestion for ${gameSlug} — no real API key set.`);
    return;
  }

  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', [gameSlug]);
  if (!gameRows.length) {
    console.warn(`[YouTube] Game not found in DB: ${gameSlug}`);
    return;
  }
  const gameId = gameRows[0].id;

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    order: 'date',
    type: 'video',
    maxResults: '50',
    key: config.YOUTUBE_API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[YouTube] API error for ${gameSlug} (channel ${channelId}):`, res.status, text);
    await query(
      `INSERT INTO ingestion_logs (game_id, platform, last_run_at, status, message)
       VALUES ($1,'YouTube',NOW(),'error',$2)
       ON CONFLICT (game_id, platform) DO UPDATE SET last_run_at=NOW(), status='error', message=$2`,
      [gameId, `HTTP ${res.status}`]
    );
    return;
  }

  const data = await res.json();
  const items = data.items || [];

  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    const { snippet } = item;
    const title = snippet.title || '';
    const category = classifyVideoTitle(gameSlug, title);

    if (!category) {
      skipped++;
      continue;
    }

    const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.default?.url ||
      '';

    await query(
      `INSERT INTO media_content
         (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, category, is_automated, status)
       VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,$8,TRUE,'published')
       ON CONFLICT (external_id) DO UPDATE
         SET category      = EXCLUDED.category,
             title         = EXCLUDED.title,
             thumbnail_url = EXCLUDED.thumbnail_url`,
      [gameId, title, snippet.description, videoId, sourceUrl, thumbnailUrl, snippet.publishedAt, category]
    );

    inserted++;
  }

  await query(
    `INSERT INTO ingestion_logs (game_id, platform, last_run_at, status, message)
     VALUES ($1,'YouTube',NOW(),'success',$2)
     ON CONFLICT (game_id, platform) DO UPDATE SET last_run_at=NOW(), status='success', message=$2`,
    [gameId, `${inserted} inserted/updated, ${skipped} skipped (no category match)`]
  );

  console.log(`[YouTube] ${gameSlug}: ${inserted} inserted/updated, ${skipped} skipped.`);
};

/**
 * Re-classifies any existing DB rows that have the old generic category='Video'.
 * Safe to run multiple times — only touches rows with category='Video'.
 */
const reclassifyExistingVideos = async (gameSlug) => {
  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', [gameSlug]);
  if (!gameRows.length) return;
  const gameId = gameRows[0].id;

  const { rows } = await query(
    `SELECT id, external_id, title FROM media_content
     WHERE game_id=$1 AND category='Video'`,
    [gameId]
  );

  let updated = 0;
  let removed = 0;

  for (const row of rows) {
    const category = classifyVideoTitle(gameSlug, row.title);
    if (category) {
      await query(
        `UPDATE media_content SET category=$1 WHERE id=$2`,
        [category, row.id]
      );
      updated++;
    } else {
      // No rule matched — hide it so it doesn't show in any tab
      await query(
        `UPDATE media_content SET status='draft' WHERE id=$1`,
        [row.id]
      );
      removed++;
    }
  }

  if (rows.length) {
    console.log(`[YouTube] Reclassified ${gameSlug}: ${updated} categorised, ${removed} set to draft.`);
  }
};

const runYouTubeIngestion = async () => {
  try {
    await ingestVideosForGame('zenless-zone-zero', config.ZZZ_JP_YOUTUBE_CHANNEL_ID);
    await ingestVideosForGame('nikke', config.NIKKE_YOUTUBE_CHANNEL_ID);
  } catch (err) {
    console.error('[YouTube] Ingestion error:', err.message);
  }
};

module.exports = { runYouTubeIngestion, reclassifyExistingVideos };
