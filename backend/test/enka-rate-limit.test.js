// Network isolation: googleRanges.refresh() would otherwise fetch gstatic.com.
require('./helpers/stub-google-ranges').install();
process.env.TASK_SECRET = 'x';
const path = require('path');
const http = require('http');
const BE = require('path').join(__dirname, '..', 'src');

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

const guard = require(path.join(BE, 'services/playerLookupGuard.js'));
const app   = require(path.join(BE, 'app.js'));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        got: ' + extra : '')); }
};

const server = app.listen(0, async () => {
  const port = server.address().port;
  const get = (p, xff) => new Promise(resolve => {
    const headers = xff ? { 'X-Forwarded-For': xff } : {};
    http.get({ port, path: p, headers }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, retryAfter: res.headers['retry-after'], body: (() => { try { return JSON.parse(b); } catch { return b; } })() }));
    });
  });

  const UID = '1300000001', UID2 = '1300000002';
  const P = g => `/api/games/${g}/player/`;

  console.log('\n--- cache prevents repeat Enka calls ---');
  guard._reset(); enkaCalls = 0;
  let r = await get(P('zenless-zone-zero') + UID, '9.9.9.1');
  check('first lookup 200', r.status === 200, r.status);
  check('  -> hit Enka once', enkaCalls === 1, enkaCalls);
  r = await get(P('zenless-zone-zero') + UID, '9.9.9.1');
  check('repeat lookup 200 (cached)', r.status === 200, r.status);
  check('  -> Enka NOT called again', enkaCalls === 1, enkaCalls);
  check('  -> same payload returned', r.body.nickname === 'Tester', JSON.stringify(r.body).slice(0,80));
  r = await get(P('zenless-zone-zero') + UID, '9.9.9.1');
  check('3rd cached view still 200 (not rate limited)', r.status === 200, r.status);

  console.log('\n--- limit applies to NEW lookups from same IP ---');
  guard._reset(); enkaCalls = 0;
  await get(P('zenless-zone-zero') + UID, '9.9.9.2');
  r = await get(P('zenless-zone-zero') + UID2, '9.9.9.2');
  check('second distinct UID -> 429', r.status === 429, r.status);
  check('  -> Retry-After header set', !!r.retryAfter, r.retryAfter);
  check('  -> retryAfter <= 120', Number(r.retryAfter) <= 120, r.retryAfter);
  check('  -> JSON body with message (frontend reads data.message)',
        typeof r.body === 'object' && typeof r.body.message === 'string', JSON.stringify(r.body));
  check('  -> Enka spared the 2nd call', enkaCalls === 1, enkaCalls);

  console.log('\n--- cached UID still served while rate limited ---');
  r = await get(P('zenless-zone-zero') + UID, '9.9.9.2');
  check('cached profile bypasses the 429', r.status === 200, r.status);

  console.log('\n--- different clients are independent ---');
  guard._reset(); enkaCalls = 0;
  await get(P('zenless-zone-zero') + UID, '9.9.9.3');
  r = await get(P('zenless-zone-zero') + UID2, '9.9.9.4');
  check('other IP not blocked', r.status === 200, r.status);

  console.log('\n--- X-Forwarded-For spoofing ---');
  // With Google's ranges loaded, a forged leading entry no longer buys a fresh
  // bucket: the last hop (9.9.9.5) is not a Google address, so the request is
  // treated as direct-to-Cloud-Run and keyed on that unforgeable last hop.
  await require('../src/utils/googleRanges.js').refresh();
  guard._reset(); enkaCalls = 0;
  await get(P('zenless-zone-zero') + UID, '9.9.9.5');
  r = await get(P('zenless-zone-zero') + UID2, '1.2.3.4, 9.9.9.5');
  check('forged leading entry no longer bypasses the limit', r.status === 429, r.status);
  guard._reset();
  await get(P('zenless-zone-zero') + UID, '198.51.100.1, 66.102.8.167');
  r = await get(P('zenless-zone-zero') + UID2, '198.51.100.1, 66.102.8.167');
  check('same user behind Google edge shares one budget', r.status === 429, r.status);
  r = await get(P('zenless-zone-zero') + UID2, '198.51.100.2, 66.102.8.167');
  check('different user behind SAME edge is independent', r.status === 200, r.status);

  console.log('\n--- errors still spend budget, are not cached ---');
  guard._reset(); enkaCalls = 0;
  const notFound = new Error('UID not found'); notFound.status = 404;
  nextResult = notFound;
  r = await get(P('zenless-zone-zero') + UID, '9.9.9.6');
  check('Enka 404 surfaced', r.status === 404, r.status);
  nextResult = null;
  r = await get(P('zenless-zone-zero') + UID, '9.9.9.6');
  check('failed lookup spent budget (no free retries)', r.status === 429, r.status);
  check('  -> error not cached', enkaCalls === 1, enkaCalls);

  console.log('\n--- validation still runs before the limiter ---');
  guard._reset();
  r = await get(P('zenless-zone-zero') + 'abc', '9.9.9.7');
  check('bad UID -> 400', r.status === 400, r.status);
  r = await get(P('zenless-zone-zero') + UID, '9.9.9.7');
  check('  -> rejected UID did not spend budget', r.status === 200, r.status);
  guard._reset();
  r = await get(P('nikke') + UID, '9.9.9.8');
  check('game with no player API -> 404', r.status === 404, r.status);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close(() => process.exit(fail ? 1 : 0));
});
