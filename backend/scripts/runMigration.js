// Runs every schema + seed step now, regardless of the fingerprint the server
// uses to skip unchanged startups (src/models/migrate.js).
const { migrate } = require('../src/models/migrate');

async function run() {
  const { failures } = await migrate({ force: true });
  console.log(failures ? `Migration complete, ${failures} step(s) failed.` : 'Migration complete.');
  process.exit(failures ? 1 : 0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
