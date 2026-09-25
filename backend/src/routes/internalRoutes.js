const router = require('express').Router();
const { ingestVideosForGame, reclassifyExistingVideos } = require('../services/youtubeIngestionService');
const { enqueueYouTubeTasks } = require('../services/ingestionScheduler');
const requireTaskSecret = require('../middleware/requireTaskSecret');
const { clientIp, parseForwardedFor, CLIENT_IP_SOURCE } = require('../utils/clientIp');
const config = require('../config');

const GAME_CHANNELS = {
  'zenless-zone-zero': config.ZZZ_YOUTUBE_CHANNEL_ID,
  'nikke':             config.NIKKE_YOUTUBE_CHANNEL_ID,
  'genshin-impact':    config.GENSHIN_YOUTUBE_CHANNEL_ID,
  'wuthering-waves':   config.WW_YOUTUBE_CHANNEL_ID,
  'honkai-star-rail':  config.HSR_YOUTUBE_CHANNEL_ID,
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

// Diagnostic: reports how this request’s client IP was resolved. Rate limiting
// keys on this value, and the answer differs between the Firebase Hosting path
// and direct Cloud Run access — this endpoint is how you confirm which entry of
// X-Forwarded-For is the real user. Secret-guarded; safe to leave deployed.
router.get('/whoami', requireTaskSecret, (req, res) => {
  res.json({
    resolvedClientIp: clientIp(req),
    strategy:         CLIENT_IP_SOURCE,
    forwardedForHops: parseForwardedFor(req),
    socketRemote:     req.socket?.remoteAddress || null,
    host:             req.headers.host || null,
  });
});

module.exports = router;
