process.env.TASK_SECRET = 'x';
process.env.SUGGESTION_RATE_MAX = '3';
process.env.SUGGESTION_RATE_WINDOW_MS = '3600000';
process.env.RATE_LIMIT_MAX = '10000'; // isolate the per-route limit

const path = require('path');
const http = require('http');
const BE = require('path').join(__dirname, '..', 'src');

// Stub the DB: capture inserts, never touch Postgres.
let inserts = [];
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, params) => {
    if (/INSERT INTO suggestions/i.test(sql)) { inserts.push(params); return { rows: [{ id: 'row-' + inserts.length }] }; }
    return { rows: [] };
  } } };

const app = require(path.join(BE, 'app.js'));

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const post = (body, xff) => new Promise(resolve => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const r = http.request({ port, method: 'POST', path: '/api/suggestions',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'X-Forwarded-For': xff || '203.0.113.1' } },
      res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({ status: res.statusCode, body: (()=>{try{return JSON.parse(b)}catch{return b}})() })); });
    r.on('error', () => resolve({ status: 0 })); r.write(data); r.end();
  });
  const valid = (over = {}) => ({ type: 'game', entry_name: 'Blue Protocol', ...over });

  console.log('\n--- happy path still works anonymously ---');
  inserts = [];
  let r = await post(valid(), '203.0.113.10');
  check('anonymous submission accepted', r.status === 201, r.status + ' ' + JSON.stringify(r.body));
  check('  -> row inserted, submitter_id null', inserts.length === 1 && inserts[0][0] === null, JSON.stringify(inserts[0]));

  console.log('\n--- type validation ---');
  check('missing type -> 400',  (await post({ entry_name: 'X' }, '203.0.113.11')).status === 400);
  check('bad type -> 400',      (await post(valid({ type: 'weapon' }), '203.0.113.12')).status === 400);

  console.log('\n--- entry_name validation ---');
  check('missing entry_name -> 400', (await post({ type: 'game' }, '203.0.113.13')).status === 400);
  check('empty entry_name -> 400',   (await post(valid({ entry_name: '' }), '203.0.113.14')).status === 400);
  check('whitespace-only -> 400',    (await post(valid({ entry_name: '    ' }), '203.0.113.15')).status === 400);
  const long = 'a'.repeat(121);
  check('entry_name > 120 chars -> 400', (await post(valid({ entry_name: long }), '203.0.113.16')).status === 400);
  check('entry_name exactly 120 -> 201', (await post(valid({ entry_name: 'a'.repeat(120) }), '203.0.113.17')).status === 201);
  const huge = 'a'.repeat(500000);
  inserts = [];
  r = await post(valid({ entry_name: huge }), '203.0.113.18');
  // 400 from validation, or 413 from the 100kb request limit that now runs first.
  check('500KB entry_name rejected (was insertable before)', [400, 413].includes(r.status), r.status);
  check('  -> nothing inserted', inserts.length === 0, inserts.length);

  console.log('\n--- game_name conditional requirement ---');
  check('character without game_name -> 400', (await post(valid({ type: 'character', entry_name: 'Hu Tao' }), '203.0.113.19')).status === 400);
  check('artwork without game_name -> 400',   (await post(valid({ type: 'artwork', entry_name: 'NY 2025' }), '203.0.113.20')).status === 400);
  check('character WITH game_name -> 201',    (await post(valid({ type: 'character', entry_name: 'Hu Tao', game_name: 'Genshin' }), '203.0.113.21')).status === 201);
  check('game type without game_name -> 201', (await post(valid(), '203.0.113.22')).status === 201);

  console.log('\n--- reference_link validation ---');
  check('valid https URL -> 201',   (await post(valid({ reference_link: 'https://example.com/x' }), '203.0.113.23')).status === 201);
  check('valid http URL -> 201',    (await post(valid({ reference_link: 'http://example.com' }), '203.0.113.24')).status === 201);
  check('omitted link -> 201',      (await post(valid(), '203.0.113.25')).status === 201);
  check('empty string link -> 201', (await post(valid({ reference_link: '' }), '203.0.113.26')).status === 201);
  check('arbitrary text -> 400',    (await post(valid({ reference_link: 'not a url at all' }), '203.0.113.27')).status === 400);
  check('javascript: scheme -> 400',(await post(valid({ reference_link: 'javascript:alert(1)' }), '203.0.113.28')).status === 400);
  check('data: scheme -> 400',      (await post(valid({ reference_link: 'data:text/html,<script>' }), '203.0.113.29')).status === 400);
  check('file: scheme -> 400',      (await post(valid({ reference_link: 'file:///etc/passwd' }), '203.0.113.30')).status === 400);
  check('link > 500 chars -> 400',  (await post(valid({ reference_link: 'https://e.com/' + 'a'.repeat(500) }), '203.0.113.31')).status === 400);

  console.log('\n--- rate limiting (max 3/hour for this test) ---');
  inserts = [];
  const IP = '203.0.113.99';
  let statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await post(valid({ entry_name: 'Spam ' + i }), IP)).status);
  check('first 3 accepted', statuses.slice(0, 3).every(s => s === 201), statuses.join(','));
  check('4th -> 429', statuses[3] === 429, statuses[3]);
  check('  -> only 3 rows inserted', inserts.length === 3, inserts.length);
  const blocked = await post(valid(), IP);
  check('  -> JSON message body', typeof blocked.body === 'object' && typeof blocked.body.message === 'string', JSON.stringify(blocked.body));

  console.log('\n--- limit is per client, and invalid bodies are free ---');
  check('different IP unaffected', (await post(valid(), '203.0.113.150')).status === 201);
  const IP2 = '203.0.113.151';
  for (let i = 0; i < 6; i++) await post({ type: 'nonsense' }, IP2);
  check('6 invalid posts did not spend budget', (await post(valid(), IP2)).status === 201);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close(() => process.exit(fail ? 1 : 0));
});
