process.env.TASK_SECRET = 'x';
process.env.RATE_LIMIT_MAX = '10000';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

// Every path that removes an image row must also remove the stored file (#45),
// or the image stays publicly reachable by URL after a delete or takedown.
// storageFiles is replaced by a recorder; its own behaviour is in storage-files.

const OLD_AVATAR = 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2FfbAlice%2Favatar%2Fold.jpg?alt=media&token=t';
const BOARD_IMG  = 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2FfbAlice%2Fboard%2Fb1.jpg?alt=media&token=t';

let deletedUrls = [], deletedPrefixes = [];
const sfPath = require.resolve(path.join(BE, 'services/storageFiles.js'));
require.cache[sfPath] = { id: sfPath, filename: sfPath, loaded: true, exports: {
  deleteImageByUrl: async (url) => { deletedUrls.push(url); },
  deletePrefix: async (prefix) => { deletedPrefixes.push(prefix); },
  deleteObject: async () => {},
} };

let caller = { id: 'u1', username: 'alice', email: 'a@x', avatar_url: null, bio: null, role: 'Regular' };
let userRow = { avatar_url: OLD_AVATAR, banner_url: null };
let boardRow = { id: 'b1', user_id: 'u1', image_url: BOARD_IMG };

const dbPath = require.resolve(path.join(BE, 'config/db.js'));
const run = async (sql, p = []) => {
  if (/FROM users WHERE firebase_uid/i.test(sql)) return { rows: [caller] };
  if (/SELECT avatar_url, banner_url FROM users/i.test(sql)) return { rows: [{ ...userRow }] };
  if (/^\s*UPDATE users SET/i.test(sql)) {
    if (/avatar_url = \$1/.test(sql)) userRow.avatar_url = p[0];
    return { rows: [{ id: 'u1', username: 'alice', ...userRow }] };
  }
  if (/^\s*DELETE FROM boards/i.test(sql)) {
    const scoped = /AND user_id = \$2/.test(sql);
    if (!boardRow || boardRow.id !== p[0] || (scoped && boardRow.user_id !== p[1])) return { rowCount: 0, rows: [] };
    const img = boardRow.image_url; boardRow = null;
    return { rowCount: 1, rows: [{ image_url: img }] };
  }
  if (/SELECT content_type, content_id FROM reports/i.test(sql)) return { rows: [{ content_type: 'board', content_id: 'b1' }] };
  if (/^\s*DELETE FROM users/i.test(sql)) return { rowCount: 1, rows: [] };
  return { rows: [], rowCount: 0 };
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  query: run,
  pool: { connect: async () => ({ query: run, release: () => {} }) },
} };

const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fbAlice' }), deleteUser: async () => {} }) } } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const send = (method, p, body) => new Promise(resolve => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const r = http.request({ port, method, path: p, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer tok' } },
      res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b })); });
    r.write(data); r.end();
  });
  const reset = () => { deletedUrls = []; deletedPrefixes = []; };

  console.log('\n--- board deletes remove the file ---');
  reset();
  let r = await send('DELETE', '/api/boards/b1');
  check('owner delete -> 200', r.status === 200, r.status);
  check('  board image file deleted', deletedUrls.length === 1 && deletedUrls[0] === BOARD_IMG, JSON.stringify(deletedUrls));

  reset(); boardRow = { id: 'b1', user_id: 'someone-else', image_url: BOARD_IMG };
  r = await send('DELETE', '/api/boards/b1');
  check('non-owner delete -> 404', r.status === 404, r.status);
  check('  no file deleted', deletedUrls.length === 0, JSON.stringify(deletedUrls));

  reset(); caller = { ...caller, role: 'Dev' };
  r = await send('DELETE', '/api/boards/b1');
  check('moderator delete -> 200', r.status === 200, r.status);
  check('  file deleted', deletedUrls[0] === BOARD_IMG, JSON.stringify(deletedUrls));

  console.log('\n--- report "Resolve & Delete" removes the file ---');
  reset(); boardRow = { id: 'b1', user_id: 'someone-else', image_url: BOARD_IMG };
  r = await send('PATCH', '/api/reports/r1', { action: 'resolve' });
  check('resolve -> 200', r.status === 200, r.status + ' ' + r.body);
  check('  board image file deleted', deletedUrls[0] === BOARD_IMG, JSON.stringify(deletedUrls));
  reset();
  r = await send('PATCH', '/api/reports/r1', { action: 'dismiss' });
  check('dismiss deletes nothing', deletedUrls.length === 0, JSON.stringify(deletedUrls));
  caller = { ...caller, role: 'Regular' };

  console.log('\n--- replacing / removing an avatar removes the old file ---');
  reset(); userRow = { avatar_url: OLD_AVATAR, banner_url: null };
  const NEW_AVATAR = 'https://firebasestorage.googleapis.com/v0/b/gachaverse-497204.firebasestorage.app/o/users%2FfbAlice%2Favatar%2Fnew-1.jpg?alt=media&token=t2';
  r = await send('PATCH', '/api/users/me', { avatar_url: NEW_AVATAR });
  check('replace -> 200', r.status === 200, r.status + ' ' + r.body);
  check('  old avatar file deleted', deletedUrls.length === 1 && deletedUrls[0] === OLD_AVATAR, JSON.stringify(deletedUrls));

  reset(); userRow = { avatar_url: OLD_AVATAR, banner_url: null };
  r = await send('PATCH', '/api/users/me', { avatar_url: null });
  check('remove -> 200', r.status === 200, r.status);
  check('  old avatar file deleted', deletedUrls[0] === OLD_AVATAR, JSON.stringify(deletedUrls));

  reset(); userRow = { avatar_url: OLD_AVATAR, banner_url: null };
  r = await send('PATCH', '/api/users/me', { bio: 'hi' });
  check('bio-only update deletes nothing', deletedUrls.length === 0, JSON.stringify(deletedUrls));

  console.log('\n--- account deletion clears the user folder ---');
  reset();
  r = await send('DELETE', '/api/users/me', { confirm: 'alice' });
  check('delete account -> 204', r.status === 204, r.status + ' ' + r.body);
  check('  users/<firebase uid>/ removed', deletedPrefixes.length === 1 && deletedPrefixes[0] === 'users/fbAlice/', JSON.stringify(deletedPrefixes));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
});
