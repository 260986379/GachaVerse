const { query } = require('../src/config/db');
const { ALL_TABLES } = require('../src/models/schema');

async function run() {
  for (let i = 0; i < ALL_TABLES.length; i++) {
    try {
      await query(ALL_TABLES[i]);
    } catch (err) {
      console.error(`❌ Migration [${i}] failed:`, err.message);
      console.error('SQL:', ALL_TABLES[i].slice(0, 120));
    }
  }
  console.log('Migration complete.');
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
