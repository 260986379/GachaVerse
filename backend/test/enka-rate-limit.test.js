// Network isolation: googleRanges.refresh() would otherwise fetch gstatic.com.
require('./helpers/stub-google-ranges').install();
process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
process.env.ENKA_GLOBAL_MAX_PER_MIN = '3'; // small, so the global ceiling is reachable here
const path = require('path');
const http = require('http');
const BE = require('path').join(__dirname, '..', 'src');

// Enka is only called by linking (PUT) and owner refresh (POST); both go
// through playerLookupGuard. These tests drive it through the link endpoint.

// Stub enkaService so no request ever leaves this process.
let enkaCalls = 0, nextResult = null;
const enkaPath = require.resolve(path.join(BE, 'services/enkaService.js'));
const fake = async (uid) => {
  enkaCalls++;
  if (nextResult instanceof Error) throw nextResult;
  return { uid, ttl: 60, nickname: 'Tester', agents: [], ...(nextResult || {}) };
};
require.cache[enkaPath] = { id: enkaPath, filename: enkaPath, loaded: true,
  exports: { fetchZZZPlayer: fake, fetchGenshinPlayer: fake, fetchHSRPlayer: fake } };

// Stub the DB: one signed-in user, in-memory game accounts.
const ME = { id: 'u1', username: 'alice', email: 'a@x', avatar_url: null, bio: null, role: 'Regular' };
let accounts = new Map();
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, p = []) => {
    if (/FROM users WHERE firebase_uid/i.test(sql)) return { rows: [ME] };
    if (/INSERT INTO user_game_accounts/i.test(sql)) {
      const snap = p[3] === null ? null : JSON.parse(p[3]);
      const row = { game_id: p[1], uid: p[2], snapshot: snap, snapshot_fetched_at: snap ? new Date() : null };
      accounts.set(p[1], row);
      return { rows: [row] };
    }
    if (/SELECT uid, snapshot_fetched_at FROM user_game_accounts/i.test(sql)) {
      const row = accounts.get(p[1]);
      return { rows: row ? [row] : [] };
    }
    if (/UPDATE user_game_accounts SET snapshot/i.test(sql)) {
      const row = accounts.get(p[1]);
      if (!row) return { rows: [] };
      Object.assign(row, { snapshot: JSON.parse(p[2]), snapshot_fetched_at: new Date() });
      return { rows: [row] };
    }
    return { rows: [], rowCount: 0 };
  } } };

const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fb' }) }) } } };

const guard = require(path.join(BE, 'services/playerLookupGuard.js'));
const app   = require(path.join(BE, 'app.js'));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        got: ' + extra : '')); }
};

const server = app.listen(0, async () => {
  const port = server.address().port;
  const send = (method, p, body, xff) => new Promise(resolve => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer tok' };
    if (xff) headers['X-Forwarded-For'] = xff;
    const r = http.request({ port, method, path: p, headers }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, retryAfter: res.headers['retry-after'], body: (() => { try { return JSON.parse(b); } catch { return b; } })() }));
    });
    r.write(data); r.end();
  });
  const link = (game, uid, xff) => send('PUT', `/api/users/me/game-accounts/${game}`, { uid }, xff);
  const refresh = (game, xff) => send('POST', `/api/users/me/game-accounts/${game}/refresh`, undefined, xff);

  const UID = '1300000001', UID2 = '1300000002', UID3 = '1300000003', UID4 = '1300000004';
  const ZZZ = 'zenless-zone-zero';

  console.log('\n--- cache prevents repeat Enka calls ---');
  guard._reset(); enkaCalls = 0;
  let r = await link(ZZZ, UID, '9.9.9.1');
  check('first link 200', r.status === 200, r.status);
  check('  -> hit Enka once', enkaCalls === 1, enkaCalls);
  r = await link(ZZZ, UID, '9.9.9.1');
  check('re-link same UID 200 (cached)', r.status === 200, r.status);
  check('  -> Enka NOT called again', enkaCalls === 1, enkaCalls);
  check('  -> same payload stored', r.body.snapshot?.nickname === 'Tester', JSON.stringify(r.body).slice(0, 80));

  console.log('\n--- per-client limit applies to NEW lookups from same IP ---');
  guard._reset(); enkaCalls = 0;
  await link(ZZZ, UID, '9.9.9.2');
  r = await link(ZZZ, UID2, '9.9.9.2');
  check('second distinct UID -> 429', r.status === 429, r.status);
  check('  -> Retry-After header set', !!r.retryAfter, r.retryAfter);
  check('  -> retryAfter <= 120', Number(r.retryAfter) <= 120, r.retryAfter);
  check('  -> reason client', r.body.reason === 'client', JSON.stringify(r.body));
  check('  -> JSON body with message (frontend reads data.message)',
        typeof r.body === 'object' && typeof r.body.message === 'string', JSON.stringify(r.body));
  check('  -> Enka spared the 2nd call', enkaCalls === 1, enkaCalls);

  console.log('\n--- cached UID still linkable while rate limited ---');
  r = await link(ZZZ, UID, '9.9.9.2');
  check('cached profile bypasses the 429', r.status === 200, r.status);

  console.log('\n--- different clients are independent ---');
  guard._reset(); enkaCalls = 0;
  await link(ZZZ, UID, '9.9.9.3');
  r = await link(ZZZ, UID2, '9.9.9.4');
  check('other IP not blocked', r.status === 200, r.status);

  console.log('\n--- X-Forwarded-For spoofing ---');
  // With Google's ranges loaded, a forged leading entry no longer buys a fresh
  // bucket: the last hop (9.9.9.5) is not a Google address, so the request is
  // treated as direct-to-Cloud-Run and keyed on that unforgeable last hop.
  await require('../src/utils/googleRanges.js').refresh();
  guard._reset(); enkaCalls = 0;
  await link(ZZZ, UID, '9.9.9.5');
  r = await link(ZZZ, UID2, '1.2.3.4, 9.9.9.5');
  check('forged leading entry no longer bypasses the limit', r.status === 429, r.status);
  guard._reset();
  await link(ZZZ, UID, '198.51.100.1, 66.102.8.167');
  r = await link(ZZZ, UID2, '198.51.100.1, 66.102.8.167');
  check('same user behind Google edge shares one budget', r.status === 429, r.status);
  r = await link(ZZZ, UID2, '198.51.100.2, 66.102.8.167');
  check('different user behind SAME edge is independent', r.status === 200, r.status);

  console.log('\n--- errors still spend budget, are not cached ---');
  guard._reset(); enkaCalls = 0;
  const notFound = new Error('UID not found'); notFound.status = 404;
  nextResult = notFound;
  r = await link(ZZZ, UID, '9.9.9.6');
  check('Enka 404 surfaced', r.status === 404, r.status);
  nextResult = null;
  r = await link(ZZZ, UID, '9.9.9.6');
  check('failed lookup spent budget (no free retries)', r.status === 429, r.status);
  check('  -> error not cached', enkaCalls === 1, enkaCalls);

  console.log('\n--- validation still runs before the limiter ---');
  guard._reset();
  r = await link(ZZZ, 'abc', '9.9.9.7');
  check('bad UID -> 400', r.status === 400, r.status);
  r = await link(ZZZ, UID, '9.9.9.7');
  check('  -> rejected UID did not spend budget', r.status === 200, r.status);
  guard._reset(); enkaCalls = 0;
  r = await link('nikke', UID, '9.9.9.8');
  check('game with no Enka API links without calling Enka', r.status === 200 && enkaCalls === 0, r.status + ' ' + enkaCalls);
  r = await link(ZZZ, UID2, '9.9.9.8');
  check('  -> and did not spend budget', r.status === 200, r.status);

  console.log('\n--- global ceiling: "Enka needs to cool down" ---');
  guard._reset(); enkaCalls = 0; accounts = new Map();
  check('global max is 3 in this suite', guard.GLOBAL_MAX === 3, guard.GLOBAL_MAX);
  await link(ZZZ, UID, '10.0.0.1');
  await link('genshin-impact', UID2, '10.0.0.2');
  await link('honkai-star-rail', UID3, '10.0.0.3');
  check('3 lookups from 3 clients all reach Enka', enkaCalls === 3, enkaCalls);

  r = await link(ZZZ, UID4, '10.0.0.4');
  check('4th lookup from a NEW client -> 429', r.status === 429, r.status);
  check('  -> reason global', r.body.reason === 'global', JSON.stringify(r.body));
  check('  -> message says Enka needs to cool down', /Enka needs to cool down/.test(r.body.message), r.body.message);
  check('  -> Retry-After within the 60s window', Number(r.retryAfter) > 0 && Number(r.retryAfter) <= 60, r.retryAfter);
  check('  -> Enka not called', enkaCalls === 3, enkaCalls);
  check('  -> existing ZZZ link untouched', accounts.get(ZZZ)?.uid === UID, JSON.stringify(accounts.get(ZZZ)));

  r = await link(ZZZ, UID, '10.0.0.5');
  check('cached UID still links while Enka cools down', r.status === 200, r.status);

  accounts.get('honkai-star-rail').snapshot_fetched_at = new Date(0); // past the 10-min refresh cooldown
  guard._reset(); enkaCalls = 0;
  await link(ZZZ, UID2, '10.0.1.1'); await link(ZZZ, UID3, '10.0.1.2'); await link(ZZZ, UID4, '10.0.1.3');
  const hsr = accounts.get('honkai-star-rail');
  const snapBefore = JSON.stringify(hsr.snapshot);
  r = await refresh('honkai-star-rail', '10.0.1.4');
  check('refresh while Enka cools down -> 429 global', r.status === 429 && r.body.reason === 'global', r.status + ' ' + JSON.stringify(r.body));
  check('  -> stored snapshot kept as-is', JSON.stringify(hsr.snapshot) === snapBefore);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close(() => process.exit(fail ? 1 : 0));
});
