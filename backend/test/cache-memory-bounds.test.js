const g = require('../src/services/playerLookupGuard.js');
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  got: ' + e : '')); } };
const T = 1_000_000_000_000;

// A realistic ZZZ-shaped showcase: agents with weapon, stats and image URLs.
const agent = (i) => ({
  id: 1000 + i, displayName: 'Agent Name ' + i, element: 'Electric', elementColor: '#ffbc2e',
  profession: 'Attacker', rarity: 'S',
  iconUrl: 'https://enka.network/ui/zzz/IconRoleCircle' + i + '.png',
  portraitUrl: 'https://enka.network/ui/zzz/IconRoleSelect' + i + '.png',
  accentColor: '#f1cc4d', level: 60, promotionLevel: 5, mindscapeLevel: 6, coreSkillLevel: 7,
  weapon: { id: 2000 + i, name: 'Signature Weapon ' + i, level: 60, refinement: 5,
            iconUrl: 'https://enka.network/ui/zzz/WeaponIcon' + i + '.png', rarity: 'S' },
});
const profile = (n = 8) => ({ uid: '1300000001', region: 'America', ttl: 60, nickname: 'Player', level: 60,
  bio: 'x'.repeat(120), agents: Array.from({ length: n }, (_, i) => agent(i)) });

const one = JSON.stringify(profile()).length;
console.log('\n  realistic 8-agent profile: ' + one + ' bytes (' + (one/1024).toFixed(1) + ' KB)');
console.log('  16MB budget holds ~' + Math.floor(16*1024*1024 / one).toLocaleString() + ' such profiles');
console.log('  entry ceiling (1000) caps it first at ~' + ((1000*one)/1024/1024).toFixed(1) + ' MB\n');

console.log('--- byte accounting stays exact ---');
g._reset();
check('starts empty', g._stats().bytes === 0 && g._stats().entries === 0);
g.setCached('zzz', 'a', profile(), T);
const after1 = g._stats();
check('bytes tracked on insert', after1.bytes === one, after1.bytes + ' vs ' + one);
g.setCached('zzz', 'a', profile(), T);
check('overwrite does not double-count', g._stats().bytes === one, g._stats().bytes);
check('  -> still one entry', g._stats().entries === 1);
g.getCached('zzz', 'a', T + 999_999);   // force expiry path
check('expiry reclaims bytes', g._stats().bytes === 0, g._stats().bytes);
check('  -> entry removed', g._stats().entries === 0);

console.log('\n--- entry ceiling enforced ---');
g._reset();
for (let i = 0; i < 1200; i++) g.setCached('zzz', 'u' + i, { ttl: 600, small: i }, T);
check('entries capped at 1000', g._stats().entries <= 1000, g._stats().entries);
check('oldest evicted', g.getCached('zzz', 'u0', T) === null);
check('newest retained', g.getCached('zzz', 'u1199', T) !== null);

console.log('\n--- byte ceiling enforced ahead of entry ceiling ---');
g._reset();
const big = { ttl: 600, blob: 'x'.repeat(2 * 1024 * 1024) }; // 2MB each
for (let i = 0; i < 20; i++) g.setCached('zzz', 'b' + i, big, T);
const st = g._stats();
check('bytes under 16MB budget', st.bytes <= 16 * 1024 * 1024, (st.bytes/1024/1024).toFixed(1) + 'MB');
check('  -> evicted on bytes, not entry count', st.entries < 20, st.entries);
check('  -> most recent still cached', g.getCached('zzz', 'b19', T) !== null);
check('  -> oldest evicted', g.getCached('zzz', 'b0', T) === null);

console.log('\n--- a single oversized entry does not wedge the cache ---');
g._reset();
g.setCached('zzz', 'huge', { ttl: 600, blob: 'x'.repeat(20 * 1024 * 1024) }, T);
check('oversized entry accepted but alone', g._stats().entries === 1, g._stats().entries);
g.setCached('zzz', 'normal', profile(), T);
check('next insert evicts it', g.getCached('zzz', 'huge', T) === null);
check('  -> new entry retained', g.getCached('zzz', 'normal', T) !== null);
check('  -> bytes back under budget', g._stats().bytes <= 16 * 1024 * 1024, (g._stats().bytes/1024/1024).toFixed(2) + 'MB');

console.log('\n--- cache still works normally ---');
g._reset();
g.setCached('zzz', '1', profile(), T);
check('hit within ttl', g.getCached('zzz', '1', T + 30_000) !== null);
check('miss after ttl', g.getCached('zzz', '1', T + 61_000) === null);
check('keys do not collide across games',
  (g.setCached('zzz','9',{ttl:60,w:'z'},T), g.setCached('gi','9',{ttl:60,w:'g'},T),
   g.getCached('zzz','9',T).w === 'z' && g.getCached('gi','9',T).w === 'g'));

console.log('\n--- rate limiter unaffected ---');
g._reset();
check('first call allowed', g.consume('ip', T).allowed === true);
check('second blocked', g.consume('ip', T + 1).allowed === false);
check('allowed after window', g.consume('ip', T + 120_000).allowed === true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
