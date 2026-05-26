const { query } = require('../config/db');
const config = require('../config');
const { classifyVideoTitle } = require('./videoClassifier');

const decodeHtmlEntities = (str) =>
  str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

// Strip channel branding. ZZZ appends it ("Title | Zenless Zone Zero");
// NIKKE prepends it ("GODDESS OF VICTORY: NIKKE | Title") — handle both.
const stripChannelSuffix = (title) =>
  title
    .replace(/^GODDESS OF VICTORY:\s*NIKKE\s*\|\s*/i, '')
    .replace(/\s*\|[^|]*$/, '')
    .trim();

const ingestVideosForGame = async (gameSlug, channelId, { forceBackfill = false } = {}) => {
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

  // playlistItems is 1 quota unit/call vs 100 for search, and supports full pagination.
  // The uploads playlist ID is always 'UU' + everything after 'UC' in the channel ID.
  const uploadsPlaylistId = 'UU' + channelId.slice(2);

  // Find the newest video already stored so we can stop early once we reach it.
  // forceBackfill disables this so we walk the entire channel history.
  let caughtUpAt = null;
  if (!forceBackfill) {
    const { rows: latestRows } = await query(
      `SELECT MAX(published_at) AS last_at FROM media_content WHERE game_id=$1 AND external_platform='YouTube'`,
      [gameId]
    );
    caughtUpAt = latestRows[0]?.last_at ? new Date(latestRows[0].last_at) : null;
  }

  let pageToken = '';
  let inserted = 0;
  let skipped = 0;
  const MAX_PAGES = forceBackfill ? 50 : 20; // backfill walks full history; incremental uses early-exit

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: config.YOUTUBE_API_KEY,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[YouTube] API error for ${gameSlug}:`, res.status, text);
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

    // Batch-fetch view counts for this page's videos (1 quota unit for up to 50 IDs)
    const pageVideoIds = items.map(i => i.snippet?.resourceId?.videoId).filter(Boolean);
    const viewCountMap = {};
    if (pageVideoIds.length > 0) {
      const statsParams = new URLSearchParams({ part: 'statistics', id: pageVideoIds.join(','), key: config.YOUTUBE_API_KEY });
      const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        for (const si of statsData.items || []) {
          viewCountMap[si.id] = parseInt(si.statistics?.viewCount || '0', 10);
        }
      }
    }

    for (const item of items) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      const { snippet } = item;
      const title = stripChannelSuffix(decodeHtmlEntities(snippet.title || ''));
      const description = decodeHtmlEntities(snippet.description || '');
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
      const viewCount = viewCountMap[videoId] ?? 0;

      await query(
        `INSERT INTO media_content
           (game_id, title, description, external_platform, external_id, source_url, thumbnail_url, published_at, category, is_automated, status, view_count)
         VALUES ($1,$2,$3,'YouTube',$4,$5,$6,$7,$8,TRUE,'published',$9)
         ON CONFLICT (external_id) DO UPDATE
           SET category      = EXCLUDED.category,
               title         = EXCLUDED.title,
               thumbnail_url = EXCLUDED.thumbnail_url,
               view_count    = EXCLUDED.view_count`,
        [gameId, title, description, videoId, sourceUrl, thumbnailUrl, snippet.publishedAt, category, viewCount]
      );

      inserted++;
    }

    // Playlist is newest-first; if the oldest video on this page is already in our DB, we're caught up
    if (caughtUpAt && items.length > 0) {
      const pageOldest = new Date(items[items.length - 1].snippet?.publishedAt || 0);
      if (pageOldest <= caughtUpAt) break;
    }

    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }

  await query(
    `INSERT INTO ingestion_logs (game_id, platform, last_run_at, status, message)
     VALUES ($1,'YouTube',NOW(),'success',$2)
     ON CONFLICT (game_id, platform) DO UPDATE SET last_run_at=NOW(), status='success', message=$2`,
    [gameId, `${inserted} inserted/updated, ${skipped} skipped (no category match)`]
  );

  console.log(`[YouTube] ${gameSlug}: ${inserted} inserted/updated, ${skipped} skipped.`);
};

const reclassifyExistingVideos = async (gameSlug) => {
  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', [gameSlug]);
  if (!gameRows.length) return;
  const gameId = gameRows[0].id;

  const { rows } = await query(
    `SELECT id, external_id, title FROM media_content
     WHERE game_id=$1 AND external_platform='YouTube' AND status='published'`,
    [gameId]
  );

  let updated = 0;
  let removed = 0;

  for (const row of rows) {
    const category = classifyVideoTitle(gameSlug, row.title);
    if (category) {
      await query(`UPDATE media_content SET category=$1 WHERE id=$2`, [category, row.id]);
      updated++;
    } else {
      await query(`UPDATE media_content SET status='draft' WHERE id=$1`, [row.id]);
      removed++;
    }
  }

  if (rows.length) {
    console.log(`[YouTube] Reclassified ${gameSlug}: ${updated} categorised, ${removed} set to draft.`);
  }
};

const runYouTubeIngestion = async () => {
  try {
    await ingestVideosForGame('zenless-zone-zero', config.ZZZ_YOUTUBE_CHANNEL_ID);
    await ingestVideosForGame('nikke', config.NIKKE_YOUTUBE_CHANNEL_ID);
  } catch (err) {
    console.error('[YouTube] Ingestion error:', err.message);
  }
};

module.exports = { runYouTubeIngestion, reclassifyExistingVideos, ingestVideosForGame };
