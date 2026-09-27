process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// #57: the user lists must read their sort keys from stored columns (kept by
// triggers, backed by indexes), not recompute them for every user per request.
// Measured on real Postgres with 10k users: directory 31 ms -> 0.6 ms,
// community 24.5 ms -> 0.2 ms (backend/scripts/benchUserLists.js).
// This pins the query shape so a later edit cannot quietly reintroduce the
// per-user subqueries.

const seen = [];
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql) => { seen.push(sql.replace(/\s+/g, ' ')); return { rows: [] }; } } };

const { ALL_TABLES } = require(path.join(BE, 'models/schema.js'));
const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const PER_USER_FOLLOW_COUNT = /SELECT COUNT\(\*\) FROM user_follows WHERE following_id = (users|u)\.id/;
const PER_USER_LATEST_BOARD = /SELECT MAX\(b\.created_at\) FROM boards b WHERE b\.user_id = u\.id/;

const server = app.listen(0, async () => {
  const port = server.address().port;
  const get = (p) => new Promise(resolve => http.get({ port, path: p }, res => { res.resume(); res.on('end', resolve); }));
  const sqlFor = async (p) => { seen.length = 0; await get(p); return seen.join(' | '); };

  console.log('\n--- list queries use stored sort keys ---');
  let s = await sqlFor('/api/users/directory');
  check('directory: no per-user follower COUNT', !PER_USER_FOLLOW_COUNT.test(s), s);
  check('directory: ordered by profile_tier, followers_count, created_at (idx_users_directory)', /ORDER BY profile_tier ASC, followers_count DESC, created_at DESC LIMIT 100/.test(s), s);

  s = await sqlFor('/api/users/community');
  check('community: no per-user follower COUNT', !PER_USER_FOLLOW_COUNT.test(s), s);
  check('community: no per-user latest-board MAX', !PER_USER_LATEST_BOARD.test(s), s);
  check('community: ordered by COALESCE(last_board_at, created_at) (idx_users_community)', /ORDER BY COALESCE\(u\.last_board_at, u\.created_at\) DESC LIMIT 20/.test(s), s);

  s = await sqlFor('/api/users/search?q=abc');
  check('search: no per-user follower COUNT', !PER_USER_FOLLOW_COUNT.test(s), s);
  check('search: ordered by stored followers_count', /ORDER BY followers_count DESC LIMIT 20/.test(s), s);

  s = await sqlFor('/api/users/some-id');
  check('profile: followers_count from the stored column', /users\.followers_count/.test(s) && !PER_USER_FOLLOW_COUNT.test(s), s);

  console.log('\n--- migration provides what the queries rely on ---');
  const mig = ALL_TABLES.join('\n');
  check('followers_count column', /ADD COLUMN IF NOT EXISTS followers_count INT NOT NULL DEFAULT 0/.test(mig));
  check('last_board_at column', /ADD COLUMN IF NOT EXISTS last_board_at TIMESTAMP/.test(mig));
  check('profile_tier generated column', /profile_tier SMALLINT GENERATED ALWAYS AS/.test(mig));
  check('follow trigger (insert + delete)', /CREATE TRIGGER trg_user_follows_count AFTER INSERT OR DELETE ON user_follows/.test(mig));
  check('board trigger (insert + delete)', /CREATE TRIGGER trg_boards_last_board AFTER INSERT OR DELETE ON boards/.test(mig));
  check('reconciliation backfill for both columns', /SET followers_count = c\.n/.test(mig) && /SET last_board_at = b\.m/.test(mig));
  for (const idx of ['idx_users_directory', 'idx_users_community', 'idx_boards_created', 'idx_boards_game_created', 'idx_users_username_trgm']) {
    check(`index ${idx}`, new RegExp(`CREATE INDEX IF NOT EXISTS ${idx}`).test(mig));
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
