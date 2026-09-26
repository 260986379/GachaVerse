/**
 * One-off (#45): move inline base64 images out of Postgres into Firebase Storage.
 *
 * For every users.avatar_url, users.banner_url and boards.image_url that is a
 * data:image/* URL, this uploads the decoded bytes to
 *   users/<owner's firebase uid>/<avatar|banner|board>/<uuid>.<ext>
 * with a download token, checks the new URL serves the same bytes, then swaps
 * the column to the URL. The row is only updated if it still holds the exact
 * value that was read, so a concurrent edit by the user is never overwritten.
 *
 *   node scripts/backfillImagesToStorage.js --dry-run   list what would move
 *   node scripts/backfillImagesToStorage.js             do it
 *
 * Safe to re-run: only rows still holding a data: URL are touched. A failure
 * leaves that row unchanged (the old image keeps working) and is listed at the end.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleAuth } = require('google-auth-library');
const { query } = require('../src/config/db');
const { FIREBASE_STORAGE_BUCKET: BUCKET } = require('../src/config');
const { parseStorageUrl } = require('../src/utils/imageSource');

const dryRun = process.argv.includes('--dry-run');
const SA_PATH = path.join(__dirname, '../firebase-service-account.json');
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const DATA_RE = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/]+={0,2})$/i;

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
  ...(fs.existsSync(SA_PATH) ? { keyFile: SA_PATH } : {}),
});

// Upload bytes with a Firebase download token, so the result is a normal
// getDownloadURL()-style link that the app and imageSource already understand.
async function upload(objectName, bytes, contentType) {
  const token = crypto.randomUUID();
  const boundary = 'b' + crypto.randomUUID();
  const meta = {
    name: objectName,
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
    metadata: { firebaseStorageDownloadTokens: token },
  };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const access = await auth.getAccessToken();
  const res = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectName)}?alt=media&token=${token}`;
}

async function run() {
  const users = await query(
    `SELECT id, username, firebase_uid, avatar_url, banner_url FROM users
     WHERE avatar_url LIKE 'data:%' OR banner_url LIKE 'data:%'`
  );
  const boards = await query(
    `SELECT b.id, b.image_url, u.username, u.firebase_uid FROM boards b JOIN users u ON u.id = b.user_id
     WHERE b.image_url LIKE 'data:%'`
  );

  const jobs = [];
  for (const u of users.rows) {
    if (u.avatar_url?.startsWith('data:')) jobs.push({ table: 'users', col: 'avatar_url', kind: 'avatar', id: u.id, who: u.username, uid: u.firebase_uid, value: u.avatar_url });
    if (u.banner_url?.startsWith('data:')) jobs.push({ table: 'users', col: 'banner_url', kind: 'banner', id: u.id, who: u.username, uid: u.firebase_uid, value: u.banner_url });
  }
  for (const b of boards.rows) jobs.push({ table: 'boards', col: 'image_url', kind: 'board', id: b.id, who: b.username, uid: b.firebase_uid, value: b.image_url });

  console.log(`${jobs.length} inline image(s) to move.`);
  let ok = 0, bytesMoved = 0;
  const failed = [];

  for (const j of jobs) {
    const label = `${j.table}.${j.col} (${j.who}, ${j.id.slice(0, 8)})`;
    try {
      if (!j.uid) throw new Error('owner has no firebase_uid');
      const m = DATA_RE.exec(j.value);
      if (!m) throw new Error('not a well-formed base64 image data URL');
      const contentType = m[1].toLowerCase();
      const ext = EXT[contentType];
      if (!ext) throw new Error(`unsupported type ${contentType}`);
      const bytes = Buffer.from(m[2], 'base64');
      const objectName = `users/${j.uid}/${j.kind}/${crypto.randomUUID()}.${ext}`;

      if (dryRun) {
        console.log(`  would move ${label}: ${contentType}, ${(bytes.length / 1024).toFixed(0)} KB -> ${objectName}`);
        continue;
      }

      const url = await upload(objectName, bytes, contentType);

      // The new link must be one the app accepts for this owner and field...
      const parsed = parseStorageUrl(url);
      if (!parsed || parsed.uid !== j.uid || parsed.kind !== j.kind) throw new Error(`generated URL would fail validation: ${url}`);
      // ...and must serve exactly the bytes we uploaded.
      const check = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const served = Buffer.from(await check.arrayBuffer());
      if (!check.ok || !served.equals(bytes)) throw new Error(`verification failed: HTTP ${check.status}, ${served.length} bytes served vs ${bytes.length}`);

      const upd = await query(
        `UPDATE ${j.table} SET ${j.col} = $1 WHERE id = $2 AND ${j.col} = $3`,
        [url, j.id, j.value]
      );
      if (upd.rowCount !== 1) throw new Error('row changed since it was read; left as is (uploaded file is now unused)');

      ok++; bytesMoved += bytes.length;
      console.log(`  ✓ ${label}: ${(bytes.length / 1024).toFixed(0)} KB`);
    } catch (err) {
      failed.push(label);
      console.log(`  ✗ ${label}: ${err.message}`);
    }
  }

  if (!dryRun) {
    console.log(`\nDone. ${ok} moved (${(bytesMoved / 1024).toFixed(0)} KB), ${failed.length} failed.`);
    if (failed.length) console.log('Failed rows still hold their original image; re-run to retry.');
  }
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => { console.error('Error:', err.message); process.exit(1); });
