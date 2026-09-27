// Verifies #57 against real Postgres in an isolated schema inside ONE transaction
// that is always rolled back. Public tables are only read (LIKE), never modified.
// Usage (from backend/): node scripts/benchUserLists.js  -- touches only a scratch schema, always rolled back.
const path = require('path');
const { pool } = require(path.join(__dirname, '../src/config/db'));
const { ALL_TABLES } = require(path.join(__dirname, '../src/models/schema'));
const SORT_KEYS = ALL_TABLES.find((s) => s.includes('trg_user_follows_count'));
const TRGM = ALL_TABLES.find((s) => s.includes('pg_trgm'));

const OLD = {
  directory: `SELECT id, username, (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count
    FROM users WHERE (false OR role != 'Debug')
    ORDER BY CASE WHEN (avatar_url IS NOT NULL AND avatar_url <> '') AND (banner_url IS NOT NULL AND banner_url <> '') THEN 0
                  WHEN (avatar_url IS NOT NULL AND avatar_url <> '') OR (banner_url IS NOT NULL AND banner_url <> '') THEN 1 ELSE 2 END ASC,
             (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) DESC, created_at DESC LIMIT 100`,
  community: `SELECT u.id, (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers_count FROM users u
    WHERE u.avatar_url IS NOT NULL AND u.avatar_url <> '' AND u.banner_url IS NOT NULL AND u.banner_url <> '' AND (false OR u.role != 'Debug')
    ORDER BY COALESCE((SELECT MAX(b.created_at) FROM boards b WHERE b.user_id = u.id), u.created_at) DESC LIMIT 20`,
  search: `SELECT id, (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count FROM users
    WHERE username ILIKE '%user12%' AND (false OR role != 'Debug')
    ORDER BY (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) DESC LIMIT 20`,
  boards: `SELECT b.id FROM boards b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC LIMIT 120`,
};
const NEW = {
  directory: `SELECT id, username, followers_count FROM users WHERE (false OR role != 'Debug')
    ORDER BY profile_tier ASC, followers_count DESC, created_at DESC LIMIT 100`,
  community: `SELECT u.id, u.followers_count FROM users u
    WHERE u.avatar_url IS NOT NULL AND u.avatar_url <> '' AND u.banner_url IS NOT NULL AND u.banner_url <> '' AND (false OR u.role != 'Debug')
    ORDER BY COALESCE(u.last_board_at, u.created_at) DESC LIMIT 20`,
  search: `SELECT id, followers_count FROM users WHERE username ILIKE '%user12%' AND (false OR role != 'Debug')
    ORDER BY followers_count DESC LIMIT 20`,
  boards: OLD.boards,
};

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('CREATE SCHEMA perf57');
    await c.query('SET LOCAL search_path TO perf57, public');
    await c.query('CREATE TABLE perf57.users (LIKE public.users INCLUDING ALL)');
    await c.query('CREATE TABLE perf57.boards (LIKE public.boards INCLUDING ALL)');
    await c.query('CREATE TABLE perf57.user_follows (LIKE public.user_follows INCLUDING ALL)');
    await c.query('ALTER TABLE perf57.boards ADD FOREIGN KEY (user_id) REFERENCES perf57.users(id) ON DELETE CASCADE');
    await c.query('ALTER TABLE perf57.user_follows ADD FOREIGN KEY (follower_id) REFERENCES perf57.users(id) ON DELETE CASCADE');
    await c.query('ALTER TABLE perf57.user_follows ADD FOREIGN KEY (following_id) REFERENCES perf57.users(id) ON DELETE CASCADE');

    console.log('\n--- migration applies on real Postgres ---');
    await c.query(SORT_KEYS);
    await c.query(TRGM);
    check('both migration steps ran', true);

    console.log('\n--- triggers ---');
    const ins = async (name, img) => (await c.query(
      `INSERT INTO users (username, email, avatar_url, banner_url) VALUES ($1::text, $1::text || '@t', $2::text, $2::text) RETURNING id`, [name, img])).rows[0].id;
    const a = await ins('ta', 'x'), b = await ins('tb', 'x'), d = await ins('td', null);
    const fc = async (id) => (await c.query('SELECT followers_count, last_board_at, profile_tier FROM users WHERE id = $1', [id])).rows[0];
    await c.query('INSERT INTO user_follows (follower_id, following_id) VALUES ($1,$2), ($3,$2)', [b, a, d]);
    check('2 follows -> followers_count 2', (await fc(a)).followers_count === 2, JSON.stringify(await fc(a)));
    await c.query('INSERT INTO user_follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [b, a]);
    check('duplicate follow (ON CONFLICT DO NOTHING) does not count', (await fc(a)).followers_count === 2);
    await c.query('DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2', [b, a]);
    check('unfollow -> 1', (await fc(a)).followers_count === 1);
    await c.query('DELETE FROM users WHERE id = $1', [d]);
    check('follower account deleted (cascade) -> 0', (await fc(a)).followers_count === 0);
    check('profile_tier: both images = 0', (await fc(a)).profile_tier === 0);
    await c.query(`INSERT INTO boards (user_id, image_url, created_at) VALUES ($1,'i','2026-01-01'), ($1,'i','2026-03-01')`, [a]);
    check('boards -> last_board_at = newest', new Date((await fc(a)).last_board_at).toISOString().startsWith('2026-03-01'), JSON.stringify(await fc(a)));
    await c.query(`DELETE FROM boards WHERE user_id = $1 AND created_at = '2026-03-01'`, [a]);
    check('delete newest -> falls back to previous', new Date((await fc(a)).last_board_at).toISOString().startsWith('2026-01-01'));
    await c.query('DELETE FROM boards WHERE user_id = $1', [a]);
    check('delete all -> NULL', (await fc(a)).last_board_at === null);
    await c.query(`UPDATE users SET banner_url = NULL WHERE id = $1`, [a]);
    check('profile_tier updates with images (one image = 1)', (await fc(a)).profile_tier === 1);
    await c.query('DELETE FROM users');

    console.log('\n--- seed 10k users / 50k boards / 30k follows ---');
    let t = Date.now();
    await c.query(`INSERT INTO users (username, email, avatar_url, banner_url, created_at)
      SELECT 'user' || g, 'user' || g || '@t',
             CASE WHEN g % 3 <> 0 THEN 'a' END, CASE WHEN g % 2 = 0 THEN 'b' END,
             NOW() - (g || ' minutes')::interval
      FROM generate_series(1, 10000) g`);
    await c.query(`INSERT INTO boards (user_id, image_url, game_id, created_at)
      SELECT u.id, 'i', 'zenless-zone-zero', NOW() - (random() * 1000 || ' hours')::interval
      FROM (SELECT id FROM users ORDER BY random() LIMIT 5000) u, generate_series(1, 10)`);
    await c.query(`INSERT INTO user_follows (follower_id, following_id)
      SELECT f.id, t.id FROM (SELECT id, row_number() OVER () r FROM users) f
      JOIN (SELECT id, row_number() OVER () r FROM users) t ON t.r = ((f.r * 7919) % 10000) + 1 AND t.id <> f.id
      UNION ALL
      SELECT f.id, t.id FROM (SELECT id, row_number() OVER () r FROM users) f
      JOIN (SELECT id, row_number() OVER () r FROM users WHERE username IN ('user1','user2','user3')) t ON (f.r % 3) + 1 = t.r AND t.id <> f.id
      ON CONFLICT DO NOTHING`);
    await c.query('ANALYZE users; ANALYZE boards; ANALYZE user_follows');
    const counts = (await c.query('SELECT (SELECT COUNT(*) FROM users)::int u, (SELECT COUNT(*) FROM boards)::int b, (SELECT COUNT(*) FROM user_follows)::int f')).rows[0];
    console.log(`  seeded ${JSON.stringify(counts)} in ${Date.now() - t} ms`);
    const drift = (await c.query(`SELECT COUNT(*)::int n FROM users u WHERE followers_count <> (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id)
      OR last_board_at IS DISTINCT FROM (SELECT MAX(created_at) FROM boards WHERE user_id = u.id)`)).rows[0].n;
    check('triggers kept every count and last_board_at exact during bulk insert', drift === 0, drift);

    console.log('\n--- old vs new queries (EXPLAIN ANALYZE, server-side ms) ---');
    const plan = async (sql) => {
      const rows = (await c.query('EXPLAIN (ANALYZE, FORMAT JSON) ' + sql)).rows[0]['QUERY PLAN'][0];
      const text = JSON.stringify(rows.Plan);
      return { ms: rows['Execution Time'], indexScan: /Index Scan|Index Only Scan|Bitmap Index Scan/.test(text), topSort: rows.Plan['Node Type'] === 'Limit' && rows.Plan.Plans?.[0]?.['Node Type'] === 'Sort', text };
    };
    for (const k of Object.keys(NEW)) {
      const o = await plan(OLD[k]), n = await plan(NEW[k]);
      const same = JSON.stringify((await c.query(OLD[k])).rows.map(r => r.id)) === JSON.stringify((await c.query(NEW[k])).rows.map(r => r.id));
      console.log(`  ${k.padEnd(10)} old ${o.ms.toFixed(1).padStart(8)} ms   new ${n.ms.toFixed(1).padStart(7)} ms   index=${n.indexScan}  same results=${same}`);
      if (k !== 'boards' && k !== 'search') check(`${k}: new plan reads an index, no full sort`, n.indexScan && !n.topSort, n.text.slice(0, 300));
      if (k === 'boards') check('boards: new index makes it an index scan', n.indexScan && !n.topSort, n.text.slice(0, 300));
      if (k === 'search') check('search: trigram index used', /idx_users_username_trgm/.test(n.text), n.text.slice(0, 300));
      if (k !== 'search') check(`${k}: same rows as the old query`, same);
      check(`${k}: new under 50 ms`, n.ms < 50, n.ms);
    }
  } finally {
    await c.query('ROLLBACK');
    c.release();
  }
  const left = (await pool.query("SELECT to_regnamespace('perf57') AS s, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='followers_count')::int AS col")).rows[0];
  console.log(`\nafter rollback: scratch schema exists=${left.s !== null}, public.users.followers_count exists=${left.col === 1}`);
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
