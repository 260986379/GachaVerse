process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// Issue #4: post/comment edit and delete, and the comments listing.
// The stub DB applies the same WHERE clauses Postgres would, so these pin who
// may do what, not which SQL string ran. Non-authors get 404 ("not found or not
// yours"), the same as boards, so the API does not reveal others' content exists.

const P1 = '11111111-1111-1111-1111-111111111111';
const C1 = '22222222-2222-2222-2222-222222222222';
let posts, comments, caller, lastListParams;
const reset = () => {
  posts = [{ id: P1, user_id: 'author', text_content: 'hello' }];
  comments = [
    { id: C1, post_id: P1, user_id: 'author', text_content: 'first', created_at: '2026-01-01T00:00:00Z' },
    { id: 'c2', post_id: P1, user_id: 'other', text_content: 'second', created_at: '2026-01-02T00:00:00Z' },
  ];
};

const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { query: async (sql, p = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/FROM users WHERE firebase_uid/i.test(s)) return { rows: [caller] };
    const table = /(UPDATE|DELETE FROM) (posts|comments)/.exec(s)?.[2];
    const list = table === 'posts' ? posts : comments;
    if (/^UPDATE (posts|comments) SET text_content/.test(s)) {
      const row = list.find(r => r.id === p[1] && r.user_id === p[2]);
      if (!row) return { rows: [], rowCount: 0 };
      row.text_content = p[0];
      return { rows: [row], rowCount: 1 };
    }
    if (/^DELETE FROM (posts|comments)/.test(s)) {
      const scoped = /AND user_id = \$2/.test(s);
      const idx = list.findIndex(r => r.id === p[0] && (!scoped || r.user_id === p[1]));
      if (idx < 0) return { rows: [], rowCount: 0 };
      list.splice(idx, 1);
      return { rows: [], rowCount: 1 };
    }
    if (/FROM comments c JOIN users u/.test(s)) {
      lastListParams = p;
      const ordered = comments.filter(c => c.post_id === p[0]).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return { rows: ordered.slice(p[2], p[2] + p[1]) };
    }
    return { rows: [], rowCount: 0 };
  } } };

const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fb' }) }) } } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };
const as = (id, role = 'Regular') => { caller = { id, username: id, email: id + '@x', avatar_url: null, bio: null, role }; };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const send = (method, p, body, token = 'tok') => new Promise(resolve => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = http.request({ port, method, path: p, headers }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: (() => { try { return JSON.parse(b); } catch { return b; } })() }));
    });
    r.write(data); r.end();
  });

  console.log('\n--- GET /api/posts/:id/comments ---');
  reset();
  let r = await send('GET', `/api/posts/${P1}/comments`, undefined, null);
  check('public, 200', r.status === 200, r.status);
  check('oldest first', r.body.items?.map(c => c.text_content).join(',') === 'first,second', JSON.stringify(r.body));
  check('has hasMore', r.body.hasMore === false, JSON.stringify(r.body));
  r = await send('GET', `/api/posts/${P1}/comments?limit=1`, undefined, null);
  check('limit=1 -> 1 item, hasMore true', r.body.items?.length === 1 && r.body.hasMore === true, JSON.stringify(r.body));
  r = await send('GET', `/api/posts/${P1}/comments?limit=-5`, undefined, null);
  check('negative limit clamped to 1 (was a 500)', r.status === 200 && lastListParams[1] === 2, `${r.status} ${JSON.stringify(lastListParams)}`);
  await send('GET', `/api/posts/${P1}/comments?limit=9999`, undefined, null);
  check('huge limit clamped to 200', lastListParams[1] === 201, JSON.stringify(lastListParams));

  for (const [label, base, id, list] of [['post', '/api/posts', P1, () => posts], ['comment', '/api/comments', C1, () => comments]]) {
    console.log(`\n--- ${label}: edit ---`);
    reset(); as('author');
    r = await send('PUT', `${base}/${id}`, { text_content: 'edited' });
    check('author edits -> 200', r.status === 200 && list().find(x => x.id === id)?.text_content === 'edited', r.status);

    reset(); as('stranger');
    r = await send('PUT', `${base}/${id}`, { text_content: 'hijack' });
    check('non-author edit -> 404', r.status === 404, r.status);
    check('  -> unchanged', list().find(x => x.id === id)?.text_content !== 'hijack');

    reset(); as('mod', 'Owner');
    r = await send('PUT', `${base}/${id}`, { text_content: 'mod edit' });
    check('moderators cannot edit others\' content -> 404', r.status === 404, r.status);

    reset();
    r = await send('PUT', `${base}/${id}`, { text_content: 'x' }, null);
    check('no token -> 401', r.status === 401, r.status);

    console.log(`\n--- ${label}: delete ---`);
    reset(); as('stranger');
    r = await send('DELETE', `${base}/${id}`);
    check('non-author delete -> 404', r.status === 404, r.status);
    check('  -> still there', list().some(x => x.id === id));

    reset(); as('vip', 'VIP');
    r = await send('DELETE', `${base}/${id}`);
    check('VIP is not a moderator -> 404', r.status === 404, r.status);

    reset(); as('author');
    r = await send('DELETE', `${base}/${id}`);
    check('author delete -> 200', r.status === 200 && !list().some(x => x.id === id), r.status);

    for (const role of ['Owner', 'Dev']) {
      reset(); as('mod-' + role, role);
      r = await send('DELETE', `${base}/${id}`);
      check(`${role} deletes someone else's ${label} -> 200`, r.status === 200 && !list().some(x => x.id === id), r.status);
    }

    reset();
    r = await send('DELETE', `${base}/${id}`, undefined, null);
    check('no token -> 401', r.status === 401, r.status);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
