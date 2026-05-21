const config = require('./src/config');
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { query } = require('./src/config/db');
const { ALL_TABLES } = require('./src/models/schema');
const { seedInitialGames, seedInitialCharacters } = require('./src/services/gameDataService');

const initDb = async () => {
  for (const sql of ALL_TABLES) {
    await query(sql);
  }
  await seedInitialGames();
  await seedInitialCharacters();
};

const start = async () => {
  await testConnection();
  try {
    await initDb();
    console.log('Database schema ready');
  } catch (err) {
    console.error('DB init error:', err.message);
  }

  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  });
};

start();
