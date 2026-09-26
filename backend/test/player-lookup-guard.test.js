const g = require('../src/services/playerLookupGuard.js');
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };
const T = 1_000_000_000_000;

console.log('\n--- rate window expiry ---');
g._reset();
check('first call allowed', g.consume('ip', T).allowed === true);
check('t+1ms blocked', g.consume('ip', T + 1).allowed === false);
check('t+119.9s still blocked', g.consume('ip', T + 119_900).allowed === false);
let r = g.consume('ip', T + 60_000);
check('  retryAfter ~60s at halfway', r.retryAfterSec === 60, r.retryAfterSec);
check('t+120s allowed again', g.consume('ip', T + 120_000).allowed === true);
g._reset();
g.consume('ip', T);
check('t+120.001s allowed', g.consume('ip', T + 120_001).allowed === true);

console.log('\n--- budget is per client ---');
g._reset();
check('ipA allowed', g.consume('A', T).allowed === true);
check('ipB unaffected by ipA', g.consume('B', T).allowed === true);
check('ipA still blocked', g.consume('A', T + 1000).allowed === false);

console.log('\n--- global ceiling across all clients ---');
g._reset();
for (let i = 0; i < g.GLOBAL_MAX; i++) g.consume('client' + i, T + i);
r = g.consume('fresh-client', T + 1000);
check(`call ${g.GLOBAL_MAX + 1} from a new client blocked`, r.allowed === false, JSON.stringify(r));
check('  reason is global', r.reason === 'global', r.reason);
check('  retryAfter = until oldest call leaves the window', r.retryAfterSec === Math.ceil((g.GLOBAL_WINDOW_MS - 1000) / 1000), r.retryAfterSec);
check('  blocked client budget NOT spent', g.consume('fresh-client', T + g.GLOBAL_WINDOW_MS).allowed === true);
g._reset();
for (let i = 0; i < g.GLOBAL_MAX; i++) g.consume('client' + i, T);
check('window frees at +GLOBAL_WINDOW_MS', g.consume('late', T + g.GLOBAL_WINDOW_MS).allowed === true);
g._reset();
g.consume('ip', T);
r = g.consume('ip', T + 1);
check('per-client block reports reason client', r.allowed === false && r.reason === 'client', JSON.stringify(r));
check('  and does not use a global slot', (() => {
  for (let i = 0; i < g.GLOBAL_MAX - 1; i++) if (!g.consume('other' + i, T + 2).allowed) return false;
  return true;
})());

console.log('\n--- cache TTL honours Enka ttl ---');
g._reset();
let ttl = g.setCached('zzz', '1', { ttl: 60 }, T);
check('ttl=60 -> 60000ms', ttl === 60_000, ttl);
check('hit at t+59s', g.getCached('zzz', '1', T + 59_000) !== null);
check('miss at t+60.001s', g.getCached('zzz', '1', T + 60_001) === null);

console.log('\n--- ttl clamping & fallbacks ---');
g._reset();
check('no ttl (HSR) -> default 60s', g.setCached('hsr', '1', { nickname: 'x' }, T) === g.DEFAULT_TTL_MS);
check('ttl=1s clamped up to 10s',    g.setCached('hsr', '2', { ttl: 1 }, T) === 10_000);
check('ttl=99999s clamped to 600s',  g.setCached('hsr', '3', { ttl: 99999 }, T) === 600_000);
check('ttl=0 -> default',            g.setCached('hsr', '4', { ttl: 0 }, T) === g.DEFAULT_TTL_MS);
check('ttl=-5 -> default',           g.setCached('hsr', '5', { ttl: -5 }, T) === g.DEFAULT_TTL_MS);
check('ttl="abc" -> default',        g.setCached('hsr', '6', { ttl: 'abc' }, T) === g.DEFAULT_TTL_MS);
check('ttl=null -> default',         g.setCached('hsr', '7', { ttl: null }, T) === g.DEFAULT_TTL_MS);

console.log('\n--- cache keys do not collide across games ---');
g._reset();
g.setCached('zzz', '123', { who: 'zzz' }, T);
g.setCached('gi',  '123', { who: 'gi'  }, T);
check('zzz:123 distinct', g.getCached('zzz', '123', T).who === 'zzz');
check('gi:123 distinct',  g.getCached('gi',  '123', T).who === 'gi');

console.log('\n--- client IP extraction ---');
const ip = (xff, sock) => g.clientIp({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress: sock } });
check('no XFF -> socket addr',            ip(undefined, '10.0.0.1') === '10.0.0.1');
check('single XFF entry',                 ip('203.0.113.9', '10.0.0.1') === '203.0.113.9');
check('client is FIRST entry (user behind Google edge)', ip('203.0.113.9, 66.102.8.167', '10.0.0.1') === '203.0.113.9');
check('multi-hop chain -> first entry',   ip('203.0.113.9, 66.102.8.167, 10.1.1.1', '10.0.0.1') === '203.0.113.9');
check('whitespace tolerated',             ip('  203.0.113.9 ,   66.102.8.167  ', '10.0.0.1') === '203.0.113.9');
check('empty XFF -> socket addr',         ip('', '10.0.0.1') === '10.0.0.1');
check('trailing comma tolerated',         ip('203.0.113.9, ', '10.0.0.1') === '203.0.113.9');
check('single-hop direct call still resolves', ip('203.0.113.9', '10.0.0.1') === '203.0.113.9');

console.log('\n--- memory is bounded ---');
g._reset();
for (let i = 0; i < 6000; i++) g.setCached('zzz', 'u' + i, { ttl: 600 }, T);
let retained = 0;
for (let i = 0; i < 6000; i++) if (g.getCached('zzz', 'u' + i, T)) retained++;
check('retained entries <= 5000 ceiling', retained <= 5000, retained);
check('oldest entry evicted under pressure', g.getCached('zzz', 'u0', T) === null);
check('newest entry retained',               g.getCached('zzz', 'u5999', T) !== null);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
