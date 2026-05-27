const config = require('./src/config');
const app = require('./src/app');
const { testConnection, query } = require('./src/config/db');
const { ALL_TABLES } = require('./src/models/schema');
const { ensureInitialGameAndIngestionLogs } = require('./src/services/gameDataService');
const { startIngestionJobs } = require('./src/services/ingestionScheduler');

const initDb = async () => {
  for (const sql of ALL_TABLES) {
    try {
      await query(sql);
    } catch (err) {
      // Log but continue — some migrations may fail on existing data (e.g. constraint checks)
      console.warn('[initDb] migration step skipped:', err.message.split('\n')[0]);
    }
  }
  await ensureInitialGameAndIngestionLogs();
};

const start = async () => {
  await testConnection();
  try {
    await initDb();
    console.log('Database schema ready');
  } catch (err) {
    console.error('DB init error:', err.message);
  }

  startIngestionJobs();

  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  });
};

start();
