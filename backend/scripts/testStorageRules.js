// Runs storage.rules against test cases via the Firebase Rules API (projects.test),
// which evaluates a draft ruleset without deploying it.
// Usage: `node scripts/testStorageRules.js` after editing the rules. Needs `gcloud` signed in.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = fs.readFileSync(path.join(__dirname, '../../storage.rules'), 'utf8');
const B = 'gachaverse-497204.firebasestorage.app';

const tc = (label, expectation, method, objPath, { uid, size = 100000, ct = 'image/jpeg' } = {}) => ({
  label,
  body: {
    expectation,
    request: {
      auth: uid ? { uid, token: {} } : null,
      method,
      path: `/b/${B}/o/${objPath}`,
      time: '2026-09-26T00:00:00Z',
      ...(method === 'create' ? { resource: { name: objPath, bucket: B, size, contentType: ct } } : {}),
    },
    ...(method === 'create' ? {} : { resource: { name: objPath, bucket: B, size: 1000, contentType: 'image/jpeg' } }),
  },
});

const cases = [
  tc('owner creates own avatar', 'ALLOW', 'create', 'users/alice/avatar/abc-1.jpg', { uid: 'alice' }),
  tc('owner creates own board', 'ALLOW', 'create', 'users/alice/board/abc-1.jpg', { uid: 'alice' }),
  tc('owner creates own banner', 'ALLOW', 'create', 'users/alice/banner/abc-1.jpg', { uid: 'alice' }),
  tc('signed-out create denied', 'DENY', 'create', 'users/alice/avatar/abc-1.jpg', {}),
  tc("writing another user's folder denied", 'DENY', 'create', 'users/bob/avatar/abc-1.jpg', { uid: 'alice' }),
  tc('unknown folder denied', 'DENY', 'create', 'users/alice/other/abc-1.jpg', { uid: 'alice' }),
  tc('svg content type denied', 'DENY', 'create', 'users/alice/avatar/abc-1.jpg', { uid: 'alice', ct: 'image/svg+xml' }),
  tc('html content type denied', 'DENY', 'create', 'users/alice/avatar/abc-1.jpg', { uid: 'alice', ct: 'text/html' }),
  tc('non-.jpg file name denied', 'DENY', 'create', 'users/alice/avatar/evil.html', { uid: 'alice' }),
  tc('2 MB and over denied', 'DENY', 'create', 'users/alice/avatar/abc-1.jpg', { uid: 'alice', size: 2 * 1024 * 1024 }),
  tc('just under 2 MB allowed', 'ALLOW', 'create', 'users/alice/avatar/abc-1.jpg', { uid: 'alice', size: 2 * 1024 * 1024 - 1 }),
  tc('empty file denied', 'DENY', 'create', 'users/alice/avatar/abc-1.jpg', { uid: 'alice', size: 0 }),
  tc('write at bucket root denied', 'DENY', 'create', 'x.jpg', { uid: 'alice' }),
  tc('anyone can fetch a file', 'ALLOW', 'get', 'users/alice/avatar/abc-1.jpg', {}),
  tc('listing a folder denied', 'DENY', 'list', 'users/alice/avatar', {}),
  tc('owner cannot overwrite', 'DENY', 'update', 'users/alice/avatar/abc-1.jpg', { uid: 'alice' }),
  tc('owner cannot delete', 'DENY', 'delete', 'users/alice/avatar/abc-1.jpg', { uid: 'alice' }),
  tc('fetch outside users/ denied', 'DENY', 'get', 'private/x.jpg', {}),
];

const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
(async () => {
  const res = await fetch('https://firebaserules.googleapis.com/v1/projects/gachaverse-497204:test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': 'gachaverse-497204', 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'storage.rules', content: src }] }, testSuite: { testCases: cases.map(c => c.body) } }),
  });
  const out = await res.json();
  if (out.error) { console.log('API error:', out.error.message); process.exit(1); }
  if (out.issues?.length) console.log('Rule issues:', JSON.stringify(out.issues, null, 1));
  let pass = 0, fail = 0;
  (out.testResults || []).forEach((r, i) => {
    const ok = r.state === 'SUCCESS';
    ok ? pass++ : fail++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${cases[i].label}${ok ? '' : '  -> ' + JSON.stringify(r.debugMessages || r.errorPosition || r.state)}`);
  });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
