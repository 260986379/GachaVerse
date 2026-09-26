process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// Caller identity, looked up by the real auth middleware via the stubbed query().
let caller = { id: 'u1', username: 'alice', email: 'a@x', avatar_url: null, bio: null, role: 'Regular' };

// Stub the DB: record every statement the transaction client runs.
let txLog = [], deleteRowCount = 1, released = 0;
const client = {
  query: async (sql, params) => { txLog.push({ sql: sql.trim(), params }); return { rowCount: /^DELETE/i.test(sql.trim()) ? deleteRowCount : 0, rows: [] }; },
  release: () => { released++; },
};
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: async (sql) => /FROM users WHERE firebase_uid/i.test(sql) ? { rows: [caller] } : { rows: [] },
    pool: { connect: async () => client },
  } };

// Stub Firebase: any bearer token verifies as fb-alice; record deleteUser calls.
let deleted = [], firebaseError = null;
const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({
    verifyIdToken: async () => ({ uid: 'fb-alice' }),
    deleteUser: async (uid) => { if (firebaseError) throw firebaseError; deleted.push(uid); },
  }) } } };

// Stored-file cleanup is tested in storage-cleanup / storage-files; never touch the bucket here.
const sfPath = require.resolve(path.join(BE, 'services/storageFiles.js'));
require.cache[sfPath] = { id: sfPath, filename: sfPath, loaded: true,
  exports: { deleteImageByUrl: async () => {}, deletePrefix: async () => {}, deleteObject: async () => {} } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const del = (body, token = 'tok') => new Promise(resolve => {
    const data = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = http.request({ port, method: 'DELETE', path: '/api/users/me', headers },
      res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({ status: res.statusCode, body: (()=>{try{return JSON.parse(b)}catch{return b}})() })); });
    r.write(data); r.end();
  });
  const reset = () => { txLog = []; deleted = []; firebaseError = null; deleteRowCount = 1; released = 0; };
  const sqls = () => txLog.map(t => t.sql.split(/\s+/)[0].toUpperCase()).join(',');

  console.log('\n--- auth and confirmation are required ---');
  reset();
  check('no token -> 401', (await del({ confirm: 'alice' }, null)).status === 401);
  let r = await del({});
  check('missing confirm -> 400', r.status === 400, r.status);
  r = await del({ confirm: 'Alice' });
  check('wrong-case confirm -> 400', r.status === 400, r.status);
  r = await del({ confirm: 'bob' });
  check('other username -> 400', r.status === 400, r.status);
  check('  -> nothing touched', txLog.length === 0 && deleted.length === 0, sqls());

  console.log('\n--- Owner is protected ---');
  reset();
  caller = { ...caller, role: 'Owner' };
  r = await del({ confirm: 'alice' });
  check('Owner -> 403', r.status === 403, r.status);
  check('  -> nothing touched', txLog.length === 0 && deleted.length === 0, sqls());
  caller = { ...caller, role: 'Regular' };

  console.log('\n--- happy path ---');
  reset();
  r = await del({ confirm: 'alice' });
  check('204 No Content', r.status === 204, r.status + ' ' + JSON.stringify(r.body));
  check('BEGIN, DELETE, COMMIT in order', sqls() === 'BEGIN,DELETE,COMMIT', sqls());
  const d = txLog.find(t => /^DELETE/i.test(t.sql)) || {};
  check('deletes from users by the caller id only', /DELETE FROM users WHERE id = \$1/.test(d.sql) && d.params?.[0] === 'u1', JSON.stringify(d));
  check('Firebase user deleted', deleted.length === 1 && deleted[0] === 'fb-alice', JSON.stringify(deleted));
  check('client released', released === 1, released);

  console.log('\n--- Firebase failure rolls the database back ---');
  reset();
  firebaseError = Object.assign(new Error('internal firebase detail'), { code: 'auth/internal-error' });
  r = await del({ confirm: 'alice' });
  check('500', r.status === 500, r.status);
  check('ROLLBACK, never COMMIT', sqls() === 'BEGIN,DELETE,ROLLBACK', sqls());
  check('client released', released === 1, released);

  console.log('\n--- Firebase user already gone still completes ---');
  reset();
  firebaseError = Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
  r = await del({ confirm: 'alice' });
  check('204', r.status === 204, r.status);
  check('COMMIT', sqls() === 'BEGIN,DELETE,COMMIT', sqls());

  console.log('\n--- row already missing ---');
  reset();
  deleteRowCount = 0;
  r = await del({ confirm: 'alice' });
  check('404', r.status === 404, r.status);
  check('rolled back, Firebase untouched', sqls() === 'BEGIN,DELETE,ROLLBACK' && deleted.length === 0, sqls());

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
