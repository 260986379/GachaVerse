const { runYouTubeIngestion } = require('./youtubeIngestionService');
const config = require('../config');

const GAME_SLUGS = [
  'zenless-zone-zero',
  'nikke',
  'genshin-impact',
  'wuthering-waves',
  'honkai-star-rail',
];

// Called by POST /internal/schedule/youtube.
// Enqueues one Cloud Task per game — each task calls POST /internal/tasks/ingest/youtube.
const enqueueYouTubeTasks = async () => {
  const { CloudTasksClient } = require('@google-cloud/tasks');
  const client = new CloudTasksClient();
  const parent = client.queuePath(config.GCP_PROJECT, config.GCP_LOCATION, config.CLOUD_TASKS_QUEUE);
  const taskUrl = `${config.CLOUD_RUN_URL}/internal/tasks/ingest/youtube`;

  for (const gameSlug of GAME_SLUGS) {
    await client.createTask({
      parent,
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url: taskUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.TASK_SECRET}`,
          },
          body: Buffer.from(JSON.stringify({ gameSlug })).toString('base64'),
        },
      },
    });
    console.log(`[Scheduler] Enqueued YouTube ingestion task for ${gameSlug}`);
  }
};

// Runs fn immediately on start, then on the given interval.
const schedule = (label, fn, intervalMs) => {
  fn();
  setInterval(fn, intervalMs);
  console.log(`[Scheduler] "${label}" scheduled every ${intervalMs / 60000} min`);
};

// In production, Cloud Scheduler fires POST /internal/schedule/youtube every hour.
// In development, fall back to a local setInterval so ingestion still runs without GCP.
const startIngestionJobs = () => {
  if (config.NODE_ENV === 'production') {
    console.log('[Scheduler] Production mode — YouTube ingestion driven by Cloud Scheduler + Cloud Tasks.');
    return;
  }
  schedule('YouTube ingestion', runYouTubeIngestion, 60 * 60 * 1000);
};

module.exports = { startIngestionJobs, enqueueYouTubeTasks };
