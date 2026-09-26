process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// One board owned by 'owner'. The stub applies the same WHERE clause Postgres would,
// so the assertions are about who can delete, not about which SQL string ran.
const BOARD = { id: '11111111-1111-1111-1111-111111111111', user_id: 'owner' };
let boards, caller;
const reset = () => { boards = [{ ...BOARD }]; };

const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, params) => {
    if (/FROM users WHERE firebase_uid/i.test(sql)) return { rows: [caller] };
    if (/^\s*DELETE FROM boards/i.test(sql)) {
      const scoped = /AND user_id = \$2/.test(sql);
      const before = boards.length;
      boards = boards.filter(b => !(b.id === params[0] && (!scoped || b.user_id === params[1])));
      return { rowCount: before - boards.length, rows: [] };
    }
    return { rows: [], rowCount: 0 };
  } } };

const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fb' }) }) } } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const as = (id, role) => { caller = { id, username: id, email: id + '@x', avatar_url: null, bio: null, role }; };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const del = (id, token = 'tok') => new Promise(resolve => {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    http.request({ port, method: 'DELETE', path: '/api/boards/' + id, headers },
      res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({ status: res.statusCode })); }).end();
  });

  console.log('\n--- ordinary users ---');
  reset(); as('owner', 'Regular');
  check('owner deletes own board -> 200', (await del(BOARD.id)).status === 200);
  check('  -> board gone', boards.length === 0);

  reset(); as('stranger', 'Regular');
  check("non-owner -> 404", (await del(BOARD.id)).status === 404);
  check('  -> board still there', boards.length === 1);

  reset(); as('vip', 'VIP');
  check('VIP is not a moderator -> 404', (await del(BOARD.id)).status === 404);
  check('  -> board still there', boards.length === 1);

  reset();
  check('no token -> 401', (await del(BOARD.id, null)).status === 401);
  check('  -> board still there', boards.length === 1);

  console.log('\n--- moderators ---');
  for (const role of ['Owner', 'Dev']) {
    reset(); as('mod-' + role, role);
    check(`${role} deletes someone else's board -> 200`, (await del(BOARD.id)).status === 200);
    check('  -> board gone', boards.length === 0);
  }
  reset(); as('mod', 'Owner');
  check('mod deleting a missing board -> 404', (await del('22222222-2222-2222-2222-222222222222')).status === 404);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
