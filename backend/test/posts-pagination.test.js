const path = require('path');
const BE = require('path').join(__dirname, '..', 'src');
const dbPath = require.resolve(path.join(BE, 'config/db.js'));

let captured = null, fakeRows = [], throwNext = false;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, params) => {
    if (throwNext) throw new Error('db down');
    captured = { sql, params };
    return { rows: fakeRows };
  } } };

const { getAllPosts } = require(path.join(BE, 'controllers/postController.js'));

const norm = s => s.replace(/\s+/g, ' ').trim();
let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '\n        got: ' + extra : '')); }
};

async function call(query, rows = []) {
  captured = null; fakeRows = rows;
  let body = null, errored = null;
  const res = { json: b => { body = b; }, status: () => res };
  await getAllPosts({ query }, res, e => { errored = e; });
  return { body, errored, sql: captured && norm(captured.sql), params: captured && captured.params };
}

(async () => {
  console.log('\n--- SQL shape & placeholder numbering ---');
  let r = await call({});
  check('no filters: no WHERE clause', !/WHERE/.test(r.sql), r.sql);
  check('no filters: LIMIT $1 OFFSET $2', /LIMIT \$1 OFFSET \$2/.test(r.sql), r.sql);
  check('no filters: params [31,0]', JSON.stringify(r.params) === '[31,0]', JSON.stringify(r.params));

  r = await call({ game_id: 'G' });
  check('game_id: WHERE p.game_id=$1', /WHERE p\.game_id=\$1 /.test(r.sql), r.sql);
  check('game_id: LIMIT $2 OFFSET $3', /LIMIT \$2 OFFSET \$3/.test(r.sql), r.sql);
  check('game_id: params ["G",31,0]', JSON.stringify(r.params) === '["G",31,0]', JSON.stringify(r.params));

  r = await call({ user_id: 'U' });
  check('user_id: WHERE p.user_id=$1', /WHERE p\.user_id=\$1 /.test(r.sql), r.sql);
  check('user_id: params ["U",31,0]', JSON.stringify(r.params) === '["U",31,0]', JSON.stringify(r.params));

  r = await call({ game_id: 'G', user_id: 'U' });
  check('both: WHERE game_id=$1 AND user_id=$2', /WHERE p\.game_id=\$1 AND p\.user_id=\$2 /.test(r.sql), r.sql);
  check('both: LIMIT $3 OFFSET $4', /LIMIT \$3 OFFSET \$4/.test(r.sql), r.sql);
  check('both: params ["G","U",31,0]', JSON.stringify(r.params) === '["G","U",31,0]', JSON.stringify(r.params));
  check('ORDER BY p.created_at DESC retained', /ORDER BY p\.created_at DESC/.test(r.sql), r.sql);
  check('values are parameterized, not interpolated', !/'G'|'U'/.test(r.sql), r.sql);

  console.log('\n--- limit clamping (the vulnerability) ---');
  check('default -> 30',            (await call({})).params[0] === 31);
  check('limit=10 honored',         (await call({ limit: '10' })).params[0] === 11);
  check('limit=9999 clamped to 100',(await call({ limit: '9999' })).params[0] === 101);
  check('limit=0 -> default 30',    (await call({ limit: '0' })).params[0] === 31);
  check('limit=abc -> default 30',  (await call({ limit: 'abc' })).params[0] === 31);
  const neg = (await call({ limit: '-5' })).params[0];
  check('limit=-5 clamped to >=1 (never negative LIMIT)', neg === 2, 'LIMIT ' + neg);

  console.log('\n--- offset / paging ---');
  check('default -> offset 0',          (await call({})).params[1] === 0);
  check('page=3 limit=10 -> offset 20', (await call({ page: '3', limit: '10' })).params[1] === 20);
  check('page=0 -> offset 0',           (await call({ page: '0' })).params[1] === 0);
  check('page=-7 -> offset 0',          (await call({ page: '-7' })).params[1] === 0);
  check('page=abc -> offset 0',         (await call({ page: 'abc' })).params[1] === 0);

  console.log('\n--- response shape & hasMore ---');
  r = await call({}, Array.from({ length: 31 }, (_, i) => ({ id: i })));
  check('hasMore true when extra row present', r.body.hasMore === true);
  check('items trimmed to 30', r.body.items.length === 30);
  check('sentinel row not leaked', r.body.items.every(x => x.id !== 30));

  r = await call({}, Array.from({ length: 5 }, (_, i) => ({ id: i })));
  check('hasMore false on short page', r.body.hasMore === false);
  check('all 5 returned', r.body.items.length === 5);

  r = await call({}, []);
  check('empty -> items [] hasMore false', Array.isArray(r.body.items) && r.body.items.length === 0 && r.body.hasMore === false);

  console.log('\n--- error propagation ---');
  throwNext = true;
  r = await call({});
  check('db error forwarded to next(err)', r.errored instanceof Error && r.errored.message === 'db down');
  throwNext = false;

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
