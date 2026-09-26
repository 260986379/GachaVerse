process.env.TASK_SECRET = 'testsecret';
process.env.RATE_LIMIT_MAX = '5';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

const http = require('http');
const app = require('../src/app.js');

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const req = (method, path, xff, auth) => new Promise(resolve => {
    const headers = {};
    if (xff) headers['X-Forwarded-For'] = xff;
    if (auth) headers['Authorization'] = auth;
    const r = http.request({ port, method, path, headers }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: (() => { try { return JSON.parse(b); } catch { return b; } })() }));
    });
    r.on('error', () => resolve({ status: 0 })); r.end();
  });
  const get = (p, xff, auth) => req('GET', p, xff, auth);

  console.log('\n--- global limit on /api ---');
  let last;
  for (let i = 0; i < 5; i++) last = await get('/api/hello', '203.0.113.10');
  check('first 5 requests allowed', last.status === 200, last.status);
  const blocked = await get('/api/hello', '203.0.113.10');
  check('6th request -> 429', blocked.status === 429, blocked.status);
  check('  -> JSON body with message', typeof blocked.body === 'object' && typeof blocked.body.message === 'string', JSON.stringify(blocked.body));
  check('  -> Retry-After header', !!blocked.headers['retry-after'], blocked.headers['retry-after']);
  check('  -> RateLimit header present', !!(blocked.headers['ratelimit'] || blocked.headers['ratelimit-limit']), JSON.stringify(blocked.headers).slice(0,200));

  console.log('\n--- budget is per client IP ---');
  const other = await get('/api/hello', '203.0.113.99');
  check('different IP unaffected', other.status === 200, other.status);

  console.log('\n--- first XFF entry identifies the client (Firebase path) ---');
  const viaEdge1 = await get('/api/hello', '198.51.100.7, 66.102.8.167');
  check('user behind Google edge allowed', viaEdge1.status === 200, viaEdge1.status);
  for (let i = 0; i < 5; i++) await get('/api/hello', '198.51.100.7, 66.102.8.167');
  const viaEdge2 = await get('/api/hello', '198.51.100.7, 66.102.8.167');
  check('same user exhausts own budget', viaEdge2.status === 429, viaEdge2.status);
  const otherUserSameEdge = await get('/api/hello', '198.51.100.8, 66.102.8.167');
  check('DIFFERENT user behind SAME edge NOT blocked', otherUserSameEdge.status === 200, otherUserSameEdge.status);

  console.log('\n--- /internal is exempt ---');
  let intStatus;
  for (let i = 0; i < 12; i++) intStatus = (await get('/internal/whoami', '203.0.113.50', 'Bearer testsecret')).status;
  check('12 internal requests, none limited', intStatus === 200, intStatus);

  console.log('\n--- /api/admin is exempt (skip) ---');
  let admStatus;
  for (let i = 0; i < 12; i++) admStatus = (await req('POST', '/api/admin/migrate-reviews', '203.0.113.60', 'Bearer wrong')).status;
  check('admin never 429 (401 from secret guard)', admStatus === 401, admStatus);

  console.log('\n--- whoami reports resolution ---');
  const who = await get('/internal/whoami', '198.51.100.7, 66.102.8.167', 'Bearer testsecret');
  check('resolves first XFF entry', who.body.resolvedClientIp === '198.51.100.7', JSON.stringify(who.body));
  check('reports strategy', who.body.strategy === 'auto', who.body.strategy);
  check('reports all hops', Array.isArray(who.body.forwardedForHops) && who.body.forwardedForHops.length === 2, JSON.stringify(who.body.forwardedForHops));
  check('whoami requires secret', (await get('/internal/whoami', '1.1.1.1')).status === 401);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close(() => process.exit(fail ? 1 : 0));
});
