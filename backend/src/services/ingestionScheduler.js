const { runYouTubeIngestion } = require('./youtubeIngestionService');
const { syncBanners } = require('./bannerSyncService');

// Runs fn immediately on start, then on the given interval.
const schedule = (label, fn, intervalMs) => {
  fn();
  setInterval(fn, intervalMs);
  console.log(`[Scheduler] "${label}" scheduled every ${intervalMs / 60000} min`);
};

const startIngestionJobs = () => {
  schedule('YouTube ingestion',  runYouTubeIngestion, 60 * 60 * 1000);
  schedule('Banner sync',        syncBanners,         6 * 60 * 60 * 1000);
};

module.exports = { startIngestionJobs };
