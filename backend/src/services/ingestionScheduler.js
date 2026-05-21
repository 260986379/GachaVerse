const { runTwitterIngestion } = require('./twitterIngestionService');
const { runYouTubeIngestion } = require('./youtubeIngestionService');

// Runs ingestion once immediately on start, then on the given interval.
const schedule = (label, fn, intervalMs) => {
  fn(); // first run
  setInterval(fn, intervalMs);
  console.log(`[Scheduler] "${label}" scheduled every ${intervalMs / 60000} min`);
};

const startIngestionJobs = () => {
  // Twitter: every 15 minutes (Twitter API rate limits)
  schedule('Twitter ingestion', runTwitterIngestion, 15 * 60 * 1000);

  // YouTube: every 60 minutes (YouTube quota is generous but limited)
  schedule('YouTube ingestion', runYouTubeIngestion, 60 * 60 * 1000);
};

module.exports = { startIngestionJobs };
