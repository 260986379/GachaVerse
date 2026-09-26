process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = require('path').join(__dirname, '..', 'src');

let lastSql = null, lastParams = null, gameMissing = false;
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, params) => {
    if (/FROM games/i.test(sql)) return { rows: gameMissing ? [] : [{ id: 'game-uuid', slug: 'nikke' }] };
    lastSql = sql.replace(/\s+/g, ' ').trim(); lastParams = params;
    return { rows: [{ id: 'm1', title: 'A' }] };
  } } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const get = (p) => new Promise(res2 => http.get({ port, path: p }, r => {
    let b=''; r.on('data',c=>b+=c); r.on('end',()=>res2({ status:r.statusCode, headers:r.headers, body:(()=>{try{return JSON.parse(b)}catch{return b}})() }));
  }));

  const r = await get('/api/games/nikke/media');
  console.log('\n--- payload slimming ---');
  check('200 OK', r.status === 200, r.status);
  check('description NOT selected', !/\bdescription\b/.test(lastSql), lastSql);
  check('title still selected', /\btitle\b/.test(lastSql));
  check('tags still selected', /\btags\b/.test(lastSql));
  check('thumbnail_url still selected', /thumbnail_url/.test(lastSql));
  check('view_count still selected', /view_count/.test(lastSql));
  check('is_automated still selected', /is_automated/.test(lastSql));
  check('external_id + external_platform kept', /external_id/.test(lastSql) && /external_platform/.test(lastSql));

  console.log('\n--- safety limit ---');
  check('LIMIT present', /LIMIT \$2/.test(lastSql), lastSql);
  check('bound to 2000', lastParams[1] === 2000, JSON.stringify(lastParams));
  check('ORDER BY published_at DESC retained', /ORDER BY published_at DESC/.test(lastSql));
  check('status=published filter retained', /status='published'/.test(lastSql));
  check('game_id parameterized', lastParams[0] === 'game-uuid', JSON.stringify(lastParams));

  console.log('\n--- caching ---');
  check('Cache-Control set', !!r.headers['cache-control'], r.headers['cache-control']);
  check('  -> public', /public/.test(r.headers['cache-control'] || ''), r.headers['cache-control']);
  check('  -> max-age=300', /max-age=300/.test(r.headers['cache-control'] || ''), r.headers['cache-control']);

  console.log('\n--- response shape unchanged (bare array) ---');
  check('still a bare array, not {items,hasMore}', Array.isArray(r.body), JSON.stringify(r.body).slice(0,60));

  console.log('\n--- /art: same safety ceiling as /media (#10) ---');
  const art = await get('/api/games/nikke/art');
  check('200 OK', art.status === 200, art.status);
  check('LIMIT present', /LIMIT \$3/.test(lastSql), lastSql);
  check('bound to 2000', lastParams[2] === 2000, JSON.stringify(lastParams));
  check('ceiling keeps the NEWEST rows', /ORDER BY published_at DESC LIMIT \$3/.test(lastSql), lastSql);
  check('...returned oldest-first as before', /\) newest ORDER BY published_at ASC$/.test(lastSql), lastSql);
  check('art categories still filtered', /category = ANY\(\$2\)/.test(lastSql) && Array.isArray(lastParams[1]));
  check('still a bare array', Array.isArray(art.body));

  console.log('\n--- /news: limit is clamped to 1..100 ---');
  await get('/api/games/nikke/news?limit=-5');
  check('negative limit -> 1 (fetches 2 to detect hasMore)', lastParams[1] === 2, JSON.stringify(lastParams));
  await get('/api/games/nikke/news?limit=999');
  check('huge limit -> 100', lastParams[1] === 101, JSON.stringify(lastParams));

  console.log('\n--- 404 path ---');
  gameMissing = true;
  const nf = await get('/api/games/nope/media');
  check('unknown game -> 404', nf.status === 404, nf.status);
  check('  -> 404 not cached', !nf.headers['cache-control'], nf.headers['cache-control']);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close(() => process.exit(fail ? 1 : 0));
});
