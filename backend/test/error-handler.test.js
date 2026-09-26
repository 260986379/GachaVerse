process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// A realistic Postgres error: message names the table, column and constraint.
const PG_MSG = 'column "secret_col" of relation "games" does not exist';
let mode = 'pg';
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async () => {
    if (mode === 'pg') {
      const e = new Error(PG_MSG);
      Object.assign(e, { code: '42703', table: 'games', column: 'secret_col', constraint: 'games_slug_key' });
      throw e;
    }
    const e = new Error('Deliberate teapot'); e.status = 418; throw e;
  } } };

// Keep the handler's winston output out of the test log, but record it.
const logged = [];
const winston = require('winston');
const origCreate = winston.createLogger;
winston.createLogger = (opts) => { const l = origCreate(opts); l.error = (m) => logged.push(m); return l; };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const get = (p) => new Promise(res2 => http.get({ port, path: p }, r => {
    let b=''; r.on('data',c=>b+=c); r.on('end',()=>res2({ status:r.statusCode, raw:b, body:(()=>{try{return JSON.parse(b)}catch{return b}})() }));
  }));

  console.log('\n--- unexpected (database) error ---');
  mode = 'pg';
  let r = await get('/api/games');
  check('500 status', r.status === 500, r.status);
  check('generic message', r.body.message === 'Internal Server Error', JSON.stringify(r.body));
  check('no table/column/constraint names in body',
    !/secret_col|relation|games_slug_key|42703/.test(r.raw), r.raw);
  const entry = logged[logged.length - 1] || {};
  check('full message still logged', entry.message === PG_MSG, JSON.stringify(entry));
  check('stack still logged', typeof entry.stack === 'string' && entry.stack.length > 0);
  check('path logged', entry.path === '/api/games', entry.path);

  console.log('\n--- deliberate error (err.status set) ---');
  mode = 'deliberate';
  r = await get('/api/games');
  check('status preserved', r.status === 418, r.status);
  check('message preserved', r.body.message === 'Deliberate teapot', JSON.stringify(r.body));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
