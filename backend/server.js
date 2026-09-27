const config = require('./src/config');
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { migrate } = require('./src/models/migrate');
const { startIngestionJobs } = require('./src/services/ingestionScheduler');
const googleRanges = require('./src/utils/googleRanges');

const start = async () => {
  await testConnection();
  try {
    // One query when schema and seed data are unchanged; see models/migrate.js.
    const { skipped, failures } = await migrate();
    console.log(skipped
      ? 'Database schema ready (unchanged, skipped)'
      : `Database schema ready (applied${failures ? `, ${failures} step(s) failed; will retry next start` : ''})`);
  } catch (err) {
    console.error('DB init error:', err.message);
  }

  // Warm Google’s published IP ranges so client-IP resolution is accurate from
  // the first request. Non-blocking: utils/clientIp falls back until it lands.
  googleRanges.refresh();

  startIngestionJobs();

  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  });
};

start();
