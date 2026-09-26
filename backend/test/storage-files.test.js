// Unit tests for services/storageFiles.js. Nothing leaves this process:
// google-auth-library and global fetch are both replaced before loading it.
const path = require('path');
const BE = path.join(__dirname, '..', 'src');
process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket';

const galPath = require.resolve('google-auth-library');
require.cache[galPath] = { id: galPath, filename: galPath, loaded: true,
  exports: { GoogleAuth: class { async getAccessToken() { return 'tok'; } } } };

const calls = [];
let respond = () => ({ ok: true, status: 204, json: async () => ({}) });
global.fetch = async (url, opts = {}) => { calls.push({ url, method: opts.method || 'GET', opts }); return respond(url, opts); };

// Silence expected error logs, but keep them countable.
const errors = [];
console.error = (...a) => errors.push(a.join(' '));

const { deleteImageByUrl, deletePrefix } = require(path.join(BE, 'services/storageFiles.js'));

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };
const url = (name, bucket = 'test-bucket') => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(name)}?alt=media&token=t1`;
const reset = () => { calls.length = 0; errors.length = 0; respond = () => ({ ok: true, status: 204, json: async () => ({}) }); };

(async () => {
  console.log('\n--- deleteImageByUrl ---');
  reset();
  await deleteImageByUrl(url('users/fbA/board/abc-1.jpg'));
  check('one DELETE request', calls.length === 1 && calls[0].method === 'DELETE', JSON.stringify(calls.map(c => c.method + ' ' + c.url)));
  check('  to the encoded object in our bucket', calls[0]?.url === 'https://storage.googleapis.com/storage/v1/b/test-bucket/o/users%2FfbA%2Fboard%2Fabc-1.jpg', calls[0]?.url);
  check('  with a bearer token', calls[0]?.opts.headers.Authorization === 'Bearer tok');
  check('  and a timeout signal', calls[0]?.opts.signal instanceof AbortSignal);

  for (const [label, v] of [
    ['data URL', 'data:image/jpeg;base64,AAAA'],
    ['Google profile picture', 'https://lh3.googleusercontent.com/a/x=s96-c'],
    ['another bucket', url('users/fbA/board/abc-1.jpg', 'other-bucket')],
    ['null', null],
    ['undefined', undefined],
  ]) {
    reset(); await deleteImageByUrl(v);
    check(`${label}: ignored, no request`, calls.length === 0, calls.length);
  }

  reset(); respond = () => ({ ok: false, status: 404 });
  await deleteImageByUrl(url('users/fbA/avatar/gone.jpg'));
  check('404 (already gone) is not an error', errors.length === 0, errors.join(' | '));

  reset(); respond = () => ({ ok: false, status: 500 });
  let threw = false;
  try { await deleteImageByUrl(url('users/fbA/avatar/x.jpg')); } catch { threw = true; }
  check('500 is logged, never thrown', !threw && errors.length === 1, `threw=${threw} errors=${errors.length}`);

  reset(); respond = () => { throw new DOMException('timeout', 'TimeoutError'); };
  threw = false;
  try { await deleteImageByUrl(url('users/fbA/avatar/x.jpg')); } catch { threw = true; }
  check('network/timeout error is logged, never thrown', !threw && errors.length === 1, `threw=${threw}`);

  console.log('\n--- deletePrefix ---');
  reset();
  respond = (u, o) => {
    if ((o.method || 'GET') === 'DELETE') return { ok: true, status: 204 };
    return u.includes('pageToken=p2')
      ? { ok: true, status: 200, json: async () => ({ items: [{ name: 'users/fbA/board/3.jpg' }] }) }
      : { ok: true, status: 200, json: async () => ({ items: [{ name: 'users/fbA/avatar/1.jpg' }, { name: 'users/fbA/banner/2.jpg' }], nextPageToken: 'p2' }) };
  };
  await deletePrefix('users/fbA/');
  const lists = calls.filter(c => c.method === 'GET'), dels = calls.filter(c => c.method === 'DELETE');
  check('lists with the prefix', lists.length === 2 && lists.every(c => c.url.includes('prefix=users%2FfbA%2F')), lists.map(c => c.url).join(' | '));
  check('follows pagination', lists[1]?.url.includes('pageToken=p2'));
  check('deletes all 3 objects', dels.length === 3, dels.length);

  for (const bad of ['', 'users/', 'users', 'users/../', 'users/fbA', 'users/fbA/board/', 'other/fbA/']) {
    reset(); await deletePrefix(bad);
    check(`refuses unsafe prefix ${JSON.stringify(bad)}`, calls.length === 0, calls.length);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
