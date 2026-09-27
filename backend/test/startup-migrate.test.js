// Startup migrations (models/migrate.js): run everything when the schema or seed
// data changed, otherwise skip with a single query. Stubbed DB; nothing is sent.
const path = require('path');
const BE = path.join(__dirname, '..', 'src');

let calls = [], stored = null, failOn = null, tableExists = false;
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, params) => {
    calls.push(sql);
    if (failOn && failOn.test(sql)) throw new Error('boom');
    if (/SELECT fingerprint FROM schema_state/.test(sql)) {
      if (!tableExists) throw new Error('relation "schema_state" does not exist');
      return { rows: stored ? [{ fingerprint: stored }] : [] };
    }
    if (/CREATE TABLE IF NOT EXISTS schema_state/.test(sql)) { tableExists = true; return { rows: [] }; }
    if (/INSERT INTO schema_state/.test(sql)) { stored = params[0]; return { rows: [] }; }
    if (/SELECT id, slug FROM games/.test(sql)) return { rows: [] };
    return { rows: [] };
  } } };

// Keep the seed step's console output out of the test log.
const origLog = console.log, origWarn = console.warn;
console.log = () => {}; console.warn = () => {};
const { migrate, FINGERPRINT } = require(path.join(BE, 'models/migrate.js'));
const { ALL_TABLES } = require(path.join(BE, 'models/schema.js'));
const out = (...a) => origLog(...a);

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; out('  PASS  ' + n); } else { fail++; out('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };
const ran = (sql) => calls.some(c => c === sql);

(async () => {
  out('\n--- first start (no schema_state yet): runs everything, records ---');
  calls = [];
  let r = await migrate();
  check('not skipped', r.skipped === false && r.failures === 0, JSON.stringify(r));
  check('all schema steps ran', ALL_TABLES.every(ran), `${ALL_TABLES.filter(s => !ran(s)).length} missing`);
  check('fingerprint recorded', stored === FINGERPRINT, stored);

  out('\n--- next start, nothing changed: one query ---');
  calls = [];
  r = await migrate();
  check('skipped', r.skipped === true, JSON.stringify(r));
  check('exactly 1 query', calls.length === 1, calls.length);
  check('no schema step ran', !ALL_TABLES.some(ran));

  out('\n--- schema or seed changed (different fingerprint): runs again ---');
  stored = 'old-fingerprint'; calls = [];
  r = await migrate();
  check('not skipped', r.skipped === false, JSON.stringify(r));
  check('all schema steps ran', ALL_TABLES.every(ran));
  check('new fingerprint recorded', stored === FINGERPRINT, stored);

  out('\n--- a failing step: fingerprint NOT recorded, so the next start retries ---');
  stored = null; calls = [];
  failOn = /ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday/;
  r = await migrate();
  check('reports 1 failure', r.failures === 1, JSON.stringify(r));
  check('later steps still ran', ran(ALL_TABLES[ALL_TABLES.length - 1]));
  check('fingerprint not recorded', stored === null, stored);
  failOn = null; calls = [];
  r = await migrate();
  check('next start retries', r.skipped === false && r.failures === 0, JSON.stringify(r));
  check('  and then records', stored === FINGERPRINT);

  out('\n--- seeding failure also blocks recording ---');
  stored = null;
  failOn = /SELECT id, slug FROM games/;
  r = await migrate();
  check('counted as a failure', r.failures === 1, JSON.stringify(r));
  check('fingerprint not recorded', stored === null, stored);
  failOn = null;

  out('\n--- force (scripts/runMigration.js) always runs ---');
  await migrate(); calls = [];
  r = await migrate({ force: true });
  check('ran despite matching fingerprint', r.skipped === false && ALL_TABLES.every(ran), JSON.stringify(r));

  out('\n--- fingerprint covers schema and seed data ---');
  check('is a sha256 hex string', /^[0-9a-f]{64}$/.test(FINGERPRINT), FINGERPRINT);

  out('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
