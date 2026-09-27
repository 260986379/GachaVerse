const crypto = require('crypto');
const { query } = require('../config/db');
const { ALL_TABLES } = require('./schema');
const { ensureInitialGameAndIngestionLogs, SEED_DATA } = require('../services/gameDataService');

/**
 * Schema + seed setup, run on server start.
 *
 * Every step is idempotent (CREATE ... IF NOT EXISTS, ON CONFLICT ...), but
 * there are ~66 of them, run one after another across the AWS (Neon) / GCP
 * (Cloud Run) link at ~30 ms each. Running them on every instance start added
 * 1.7–2.9 s to each cold start and to every instance added during a traffic
 * spike (#46).
 *
 * So after a fully successful run we record a fingerprint of the schema SQL and
 * seed data in schema_state. A later start compares it with one query and
 * skips everything when nothing changed. A deploy that changes schema.js or the
 * seed data gets a new fingerprint and runs the steps on its first start, as
 * before.
 *
 * If any step fails, the fingerprint is NOT recorded, so the next start retries
 * (the previous behaviour: failures are logged and the server still starts).
 */

const FINGERPRINT = crypto
  .createHash('sha256')
  .update(JSON.stringify({ schema: ALL_TABLES, seed: SEED_DATA }))
  .digest('hex');

const CREATE_SCHEMA_STATE = `
  CREATE TABLE IF NOT EXISTS schema_state (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    fingerprint TEXT NOT NULL,
    applied_at  TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

const recordedFingerprint = async () => {
  try {
    const { rows } = await query('SELECT fingerprint FROM schema_state WHERE id = 1');
    return rows[0]?.fingerprint || null;
  } catch {
    return null; // table not created yet: first run
  }
};

/**
 * Apply schema and seed data if they changed since the last successful run.
 * `force` runs everything regardless (scripts/runMigration.js).
 * Returns { skipped, failures }.
 */
const migrate = async ({ force = false } = {}) => {
  if (!force && (await recordedFingerprint()) === FINGERPRINT) {
    return { skipped: true, failures: 0 };
  }

  let failures = 0;
  for (const sql of ALL_TABLES) {
    try {
      await query(sql);
    } catch (err) {
      failures++;
      // Log but continue — some migrations may fail on existing data (e.g. constraint checks)
      console.warn('[migrate] step skipped:', err.message.split('\n')[0]);
    }
  }
  try {
    await ensureInitialGameAndIngestionLogs();
  } catch (err) {
    failures++;
    console.warn('[migrate] seeding failed:', err.message.split('\n')[0]);
  }

  if (failures === 0) {
    await query(CREATE_SCHEMA_STATE);
    await query(
      `INSERT INTO schema_state (id, fingerprint, applied_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET fingerprint = EXCLUDED.fingerprint, applied_at = NOW()`,
      [FINGERPRINT]
    );
  }
  return { skipped: false, failures };
};

module.exports = { migrate, FINGERPRINT };
