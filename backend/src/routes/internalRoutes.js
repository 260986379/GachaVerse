const router = require('express').Router();
const { ingestVideosForGame, reclassifyExistingVideos } = require('../services/youtubeIngestionService');
const { enqueueYouTubeTasks } = require('../services/ingestionScheduler');
const config = require('../config');

const GAME_CHANNELS = {
  'zenless-zone-zero': config.ZZZ_YOUTUBE_CHANNEL_ID,
  'nikke':             config.NIKKE_YOUTUBE_CHANNEL_ID,
  'genshin-impact':    config.GENSHIN_YOUTUBE_CHANNEL_ID,
  'wuthering-waves':   config.WW_YOUTUBE_CHANNEL_ID,
  'honkai-star-rail':  config.HSR_YOUTUBE_CHANNEL_ID,
};

const requireTaskSecret = (req, res, next) => {
  if (!config.TASK_SECRET) return res.status(503).json({ error: 'TASK_SECRET not configured' });
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${config.TASK_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// Cloud Scheduler calls this every hour.
// Fans out one Cloud Task per game channel.
router.post('/schedule/youtube', requireTaskSecret, async (req, res) => {
  try {
    await enqueueYouTubeTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error('[Internal] Failed to enqueue YouTube tasks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Each Cloud Task calls this with { gameSlug } in the body.
// Returns 500 on failure so Cloud Tasks retries automatically.
router.post('/tasks/ingest/youtube', requireTaskSecret, async (req, res) => {
  const { gameSlug } = req.body;
  const channelId = GAME_CHANNELS[gameSlug];
  if (!channelId) return res.status(400).json({ error: `Unknown game slug: ${gameSlug}` });

  try {
    await ingestVideosForGame(gameSlug, channelId);
    res.json({ ok: true, gameSlug });
  } catch (err) {
    console.error(`[Internal] Ingestion failed for ${gameSlug}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Force a full channel walk for a single game, re-fetching all pages and
// re-running classification. Useful after adding new classifier rules.
router.post('/tasks/ingest/youtube/backfill', requireTaskSecret, async (req, res) => {
  const { gameSlug } = req.body;
  const channelId = GAME_CHANNELS[gameSlug];
  if (!channelId) return res.status(400).json({ error: `Unknown game slug: ${gameSlug}` });

  try {
    await ingestVideosForGame(gameSlug, channelId, { forceBackfill: true });
    await reclassifyExistingVideos(gameSlug);
    res.json({ ok: true, gameSlug });
  } catch (err) {
    console.error(`[Internal] Backfill failed for ${gameSlug}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
