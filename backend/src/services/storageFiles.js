const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const { FIREBASE_STORAGE_BUCKET } = require('../config');
const { parseStorageUrl } = require('../utils/imageSource');

/**
 * Deleting user-uploaded images from Firebase Storage (#45).
 *
 * Deleting a board, report target, avatar, banner or account used to remove
 * only the database row. With images in a bucket, the file would stay publicly
 * reachable by URL, so a takedown would not take anything down. Every such
 * path calls into here as well.
 *
 * This talks to the Cloud Storage JSON API directly instead of
 * admin.storage(): the production image installs with --omit=optional, which
 * leaves out @google-cloud/storage (it carried every remaining npm advisory,
 * #53). google-auth-library is a regular dependency, so it is present.
 *
 * Credentials: the service-account file when it exists (local dev, same as
 * config/firebase.js), otherwise Application Default Credentials (Cloud Run).
 *
 * All deletes are best-effort: a failure is logged, never thrown, because the
 * database change it follows has already happened and must not be reported as
 * failed. A missed file is an orphan, not a broken page.
 */

const API = 'https://storage.googleapis.com/storage/v1';
const TIMEOUT_MS = 10 * 1000;
const SA_PATH = path.join(__dirname, '../../firebase-service-account.json');

let auth;
const getAuth = () => {
  if (!auth) {
    auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
      ...(fs.existsSync(SA_PATH) ? { keyFile: SA_PATH } : {}),
    });
  }
  return auth;
};

const authorizedFetch = async (url, options = {}) => {
  const token = await getAuth().getAccessToken();
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
};

/** Delete one object by name. A 404 (already gone) counts as success. */
const deleteObject = async (objectName, bucket = FIREBASE_STORAGE_BUCKET) => {
  const res = await authorizedFetch(`${API}/b/${bucket}/o/${encodeURIComponent(objectName)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Storage delete ${objectName} failed: ${res.status}`);
};

/**
 * Delete the file behind an image column value, if it is one of our Storage
 * URLs. Data URLs, Google profile pictures and anything else are ignored.
 */
const deleteImageByUrl = async (value) => {
  const parsed = parseStorageUrl(value);
  if (!parsed) return;
  try {
    await deleteObject(parsed.objectName);
  } catch (err) {
    console.error('[storage] delete failed:', parsed.objectName, err.message);
  }
};

/** Delete every object under a prefix, e.g. users/<uid>/ on account deletion. */
const deletePrefix = async (prefix, bucket = FIREBASE_STORAGE_BUCKET) => {
  if (!/^users\/[A-Za-z0-9]{1,128}\/$/.test(prefix)) {
    // Never allow a broad prefix (e.g. "users/" or "") to reach a bulk delete.
    console.error('[storage] refusing to delete unexpected prefix:', prefix);
    return;
  }
  try {
    let pageToken;
    do {
      const q = new URLSearchParams({ prefix, fields: 'items(name),nextPageToken' });
      if (pageToken) q.set('pageToken', pageToken);
      const res = await authorizedFetch(`${API}/b/${bucket}/o?${q}`);
      if (!res.ok) throw new Error(`Storage list ${prefix} failed: ${res.status}`);
      const body = await res.json();
      for (const item of body.items || []) {
        try { await deleteObject(item.name, bucket); }
        catch (err) { console.error('[storage] delete failed:', item.name, err.message); }
      }
      pageToken = body.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error('[storage] prefix delete failed:', prefix, err.message);
  }
};

module.exports = { deleteImageByUrl, deletePrefix, deleteObject };
