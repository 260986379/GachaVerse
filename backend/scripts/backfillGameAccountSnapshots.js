/**
 * One-off: fill user_game_accounts.snapshot for accounts linked before
 * snapshots existed (ZZZ / Genshin / HSR only; other games store a UID only).
 *
 * Run after the server has started once, so the snapshot columns exist.
 *
 *   node scripts/backfillGameAccountSnapshots.js            backfill
 *   node scripts/backfillGameAccountSnapshots.js --dry-run  list what would be fetched
 *
 * Requests are sequential with a pause between them, to stay polite to Enka.
 * Accounts that fail (UID not found, Enka down) are left NULL and listed at the
 * end; re-running only retries rows that are still NULL.
 */
const { query } = require('../src/config/db');
const { SNAPSHOT_FETCHERS } = require('../src/services/playerSnapshot');

const DELAY_MS = 3000;
const dryRun = process.argv.includes('--dry-run');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const { rows } = await query(
    `SELECT user_id, game_id, uid FROM user_game_accounts
     WHERE snapshot IS NULL AND game_id = ANY($1)
     ORDER BY linked_at`,
    [Object.keys(SNAPSHOT_FETCHERS)]
  );
  console.log(`${rows.length} linked account(s) without a snapshot.`);
  if (dryRun) {
    rows.forEach((r) => console.log(`  ${r.game_id}  uid=${r.uid}  user=${r.user_id}`));
    process.exit(0);
  }

  let ok = 0;
  const failed = [];
  for (const [i, r] of rows.entries()) {
    if (i > 0) await sleep(DELAY_MS);
    try {
      const data = await SNAPSHOT_FETCHERS[r.game_id](r.uid);
      await query(
        `UPDATE user_game_accounts SET snapshot = $3::jsonb, snapshot_fetched_at = NOW()
         WHERE user_id = $1 AND game_id = $2 AND snapshot IS NULL`,
        [r.user_id, r.game_id, JSON.stringify(data)]
      );
      ok++;
      console.log(`  ✓ ${r.game_id} uid=${r.uid}`);
    } catch (err) {
      failed.push({ ...r, error: err.message });
      console.log(`  ✗ ${r.game_id} uid=${r.uid}: ${err.message}`);
    }
  }

  console.log(`\nDone. ${ok} stored, ${failed.length} failed.`);
  if (failed.length) console.log('Failed rows stay NULL; re-run to retry them.');
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
