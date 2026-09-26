// Network isolation: googleRanges.refresh() would otherwise fetch gstatic.com.
require('./helpers/stub-google-ranges').install();
process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

const ME = { id: 'u1', username: 'alice', email: 'a@x', avatar_url: null, bio: null, role: 'Regular' };

// Stub enkaService: count calls, never touch the network.
let enkaCalls = 0, enkaError = null, enkaLevel = 50;
const enkaPath = require.resolve(path.join(BE, 'services/enkaService.js'));
const fake = async (uid) => {
  enkaCalls++;
  if (enkaError) throw enkaError;
  return { uid, ttl: 60, nickname: 'Tester', level: enkaLevel, agents: [] };
};
require.cache[enkaPath] = { id: enkaPath, filename: enkaPath, loaded: true,
  exports: { fetchZZZPlayer: fake, fetchGenshinPlayer: fake, fetchHSRPlayer: fake } };

// Stub the DB with an in-memory user_game_accounts keyed "user|game".
let accounts = new Map();
const key = (u, g) => u + '|' + g;
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, p = []) => {
    if (/FROM users WHERE firebase_uid/i.test(sql)) return { rows: [ME] };
    if (/INSERT INTO user_game_accounts/i.test(sql)) {
      const snap = p[3] === null ? null : JSON.parse(p[3]);
      const row = { game_id: p[1], uid: p[2], linked_at: new Date(), snapshot: snap, snapshot_fetched_at: snap ? new Date() : null };
      accounts.set(key(p[0], p[1]), row);
      return { rows: [row] };
    }
    if (/^\s*UPDATE user_game_accounts SET snapshot/i.test(sql)) {
      const row = accounts.get(key(p[0], p[1]));
      if (!row) return { rows: [] };
      Object.assign(row, { snapshot: JSON.parse(p[2]), snapshot_fetched_at: new Date() });
      return { rows: [row] };
    }
    if (/SELECT uid, snapshot_fetched_at FROM user_game_accounts/i.test(sql)) {
      const row = accounts.get(key(p[0], p[1]));
      return { rows: row ? [row] : [] };
    }
    if (/FROM user_game_accounts WHERE user_id = \$1$/im.test(sql.trim())) {
      return { rows: [...accounts.entries()].filter(([k]) => k.startsWith(p[0] + '|')).map(([, v]) => v) };
    }
    return { rows: [], rowCount: 0 };
  } } };

const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fb' }) }) } } };

const guard = require(path.join(BE, 'services/playerLookupGuard.js'));
const { REFRESH_COOLDOWN_MS } = require(path.join(BE, 'services/playerSnapshot.js'));
const app = require(path.join(BE, 'app.js'));

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const req = (method, p, body, auth = true) => new Promise(resolve => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (auth) headers.Authorization = 'Bearer tok';
    const r = http.request({ port, method, path: p, headers }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, retryAfter: res.headers['retry-after'], body: (() => { try { return JSON.parse(b); } catch { return b; } })() }));
    });
    r.write(data); r.end();
  });
  const link = (game, body) => req('PUT', `/api/users/me/game-accounts/${game}`, body);
  const refresh = (game) => req('POST', `/api/users/me/game-accounts/${game}/refresh`);
  const fresh = () => { guard._reset(); enkaCalls = 0; enkaError = null; };
  const UID = '1300000001';

  console.log('\n--- linking an Enka game stores a snapshot ---');
  fresh(); accounts = new Map();
  let r = await link('zenless-zone-zero', { uid: UID });
  check('200', r.status === 200, r.status + ' ' + JSON.stringify(r.body));
  check('Enka called once', enkaCalls === 1, enkaCalls);
  check('response carries the snapshot', r.body.snapshot?.nickname === 'Tester', JSON.stringify(r.body.snapshot));
  check('snapshot_fetched_at set', !!r.body.snapshot_fetched_at);
  check('stored', accounts.get(key('u1', 'zenless-zone-zero'))?.snapshot?.level === 50);

  console.log('\n--- client cannot plant its own snapshot ---');
  fresh(); accounts = new Map();
  r = await link('genshin-impact', { uid: UID, snapshot: { nickname: 'FAKE', level: 9999 } });
  const stored = accounts.get(key('u1', 'genshin-impact'))?.snapshot;
  check('stored snapshot comes from Enka', stored?.nickname === 'Tester' && stored?.level === 50, JSON.stringify(stored));

  console.log('\n--- link validation and failures ---');
  fresh(); accounts = new Map();
  r = await link('honkai-star-rail', { uid: '12ab' });
  check('bad UID format -> 400', r.status === 400, r.status);
  check('  -> no Enka call, nothing stored', enkaCalls === 0 && accounts.size === 0);
  r = await link('honkai-star-rail', {});
  check('missing uid -> 400', r.status === 400, r.status);

  fresh();
  enkaError = Object.assign(new Error('UID not found'), { status: 404 });
  r = await link('honkai-star-rail', { uid: UID });
  check('unknown UID -> 404 with Enka message', r.status === 404 && r.body.message === 'UID not found', r.status + ' ' + JSON.stringify(r.body));
  check('  -> nothing stored', accounts.size === 0);

  fresh();
  guard.consume(guard.clientIp({ headers: {}, socket: { remoteAddress: '::1' } }));
  guard.consume(guard.clientIp({ headers: {}, socket: { remoteAddress: '::ffff:127.0.0.1' } }));
  guard.consume(guard.clientIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }));
  r = await link('zenless-zone-zero', { uid: '1300000009' });
  check('lookup budget spent -> 429 with Retry-After', r.status === 429 && Number(r.retryAfter) > 0, r.status);
  check('  -> no Enka call', enkaCalls === 0, enkaCalls);

  console.log('\n--- non-Enka games store the UID only ---');
  fresh(); accounts = new Map();
  r = await link('nikke', { uid: 'any-format-123' });
  check('200', r.status === 200, r.status);
  check('no Enka call', enkaCalls === 0, enkaCalls);
  check('snapshot null', r.body.snapshot === null && r.body.snapshot_fetched_at === null, JSON.stringify(r.body));

  console.log('\n--- public profile reads never call Enka ---');
  fresh(); accounts = new Map();
  await link('zenless-zone-zero', { uid: UID });
  enkaCalls = 0;
  for (let i = 0; i < 5; i++) r = await req('GET', '/api/users/u1/game-accounts', undefined, false);
  check('200', r.status === 200, r.status);
  check('snapshot included', r.body[0]?.snapshot?.nickname === 'Tester', JSON.stringify(r.body));
  check('5 views, 0 Enka calls', enkaCalls === 0, enkaCalls);

  console.log('\n--- refresh ---');
  fresh();
  r = await refresh('zenless-zone-zero');
  check('within cooldown -> 429', r.status === 429, r.status);
  check('  Retry-After about 10 min', Number(r.retryAfter) > REFRESH_COOLDOWN_MS / 1000 - 5, r.retryAfter);
  check('  -> no Enka call', enkaCalls === 0, enkaCalls);

  accounts.get(key('u1', 'zenless-zone-zero')).snapshot_fetched_at = new Date(Date.now() - REFRESH_COOLDOWN_MS - 1000);
  fresh(); enkaLevel = 51;
  r = await refresh('zenless-zone-zero');
  check('after cooldown -> 200', r.status === 200, r.status + ' ' + JSON.stringify(r.body));
  check('  Enka called once', enkaCalls === 1, enkaCalls);
  check('  snapshot updated', r.body.snapshot?.level === 51, JSON.stringify(r.body.snapshot));
  check('  fetched_at is now', Date.now() - new Date(r.body.snapshot_fetched_at).getTime() < 5000);

  fresh();
  check('not linked -> 404', (await refresh('genshin-impact')).status === 404);
  check('non-Enka game -> 400', (await refresh('nikke')).status === 400);
  check('no token -> 401', (await req('POST', '/api/users/me/game-accounts/zenless-zone-zero/refresh', undefined, false)).status === 401);
  check('  -> no Enka calls', enkaCalls === 0, enkaCalls);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
