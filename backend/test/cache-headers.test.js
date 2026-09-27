process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// #49: which responses Firebase Hosting's CDN may share between visitors.
// Getting this wrong in one direction leaks one viewer's response to others;
// in the other it silently throws away the caching. Both directions are pinned.

let dbFails = false, gameMissing = false;
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql) => {
    if (dbFails) throw new Error('db down');
    if (/FROM users WHERE firebase_uid/i.test(sql)) return { rows: [{ id: 'u1', username: 'mod', role: 'Owner' }] };
    if (/FROM games WHERE (id|slug)=\$1/i.test(sql)) return { rows: gameMissing ? [] : [{ id: 'g1', slug: 'zzz' }] };
    if (/COUNT\(\*\)/i.test(sql)) return { rows: [{ count: '0', total: '0' }] };
    return { rows: [] };
  } } };
const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fb' }) }) } } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const get = (p, token) => new Promise(resolve => {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    http.get({ port, path: p, headers }, res => { res.resume(); res.on('end', () => resolve({ status: res.statusCode, cc: res.headers['cache-control'] || '', vary: res.headers['vary'] || '' })); });
  });
  const isShared = (r, s) => r.cc === `public, max-age=${s}, s-maxage=${s}`;

  console.log('\n--- same for every viewer: always shareable ---');
  for (const [p, s] of [
    ['/api/games', 300], ['/api/games/trending', 300], ['/api/games/zzz', 300],
    ['/api/games/zzz/characters', 600], ['/api/games/zzz/art', 300],
    ['/api/boards/all', 60], ['/api/boards/game/zzz', 60],
  ]) {
    const r = await get(p);
    check(`${p} -> public ${s}s`, r.status === 200 && isShared(r, s), `${r.status} ${r.cc}`);
  }

  console.log('\n--- per-viewer endpoints: shareable only when signed out ---');
  for (const p of ['/api/reviews/zzz', '/api/users/community', '/api/users/directory', '/api/users/search?q=ab']) {
    let r = await get(p);
    check(`${p} signed out -> public 60s`, r.status === 200 && isShared(r, 60), `${r.status} ${r.cc}`);
    check('  Vary: Authorization', /authorization/i.test(r.vary), r.vary);
    r = await get(p, 'tok');
    check(`${p} signed in -> private, no-store`, r.status === 200 && r.cc === 'private, no-store', `${r.status} ${r.cc}`);
    check('  Vary: Authorization', /authorization/i.test(r.vary), r.vary);
  }

  console.log('\n--- errors are never cached ---');
  gameMissing = true;
  let r = await get('/api/games/nope');
  check('404 -> no-store', r.status === 404 && r.cc === 'no-store', `${r.status} ${r.cc}`);
  r = await get('/api/games/nope/characters');
  check('404 characters -> no-store', r.status === 404 && r.cc === 'no-store', `${r.status} ${r.cc}`);
  gameMissing = false;
  dbFails = true;
  r = await get('/api/boards/all');
  check('500 -> no-store', r.status === 500 && r.cc === 'no-store', `${r.status} ${r.cc}`);
  r = await get('/api/reviews/zzz');
  check('500 on per-viewer endpoint -> no-store', r.status === 500 && r.cc === 'no-store', `${r.status} ${r.cc}`);
  dbFails = false;

  console.log('\n--- revalidation (304) keeps the caching header ---');
  const etag = await new Promise(resolve => http.get({ port, path: '/api/games' }, res => { res.resume(); resolve(res.headers.etag); }));
  r = await new Promise(resolve => http.get({ port, path: '/api/games', headers: { 'If-None-Match': etag } }, res => { res.resume(); res.on('end', () => resolve({ status: res.statusCode, cc: res.headers['cache-control'] || '' })); }));
  check('304 Not Modified -> still public', r.status === 304 && isShared(r, 300), `${r.status} ${r.cc}`);

  console.log('\n--- endpoints that must stay uncached ---');
  for (const p of ['/api/boards/user/u1', '/api/users/u1', '/api/users/u1/game-accounts']) {
    r = await get(p);
    check(`${p} not shareable`, !/public/.test(r.cc), `${r.status} ${r.cc}`);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
