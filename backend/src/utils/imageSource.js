const Joi = require('joi');
const { FIREBASE_STORAGE_BUCKET } = require('../config');

/**
 * Validator for user-writable image columns: boards.image_url,
 * users.avatar_url, users.banner_url.
 *
 * The only accepted value is a Firebase Storage download URL for a file in the
 * CALLER'S OWN folder of our bucket, in the folder for this field (#45):
 *        https://firebasestorage.googleapis.com/v0/b/<bucket>/o/users%2F<uid>%2F<kind>%2F<id>.jpg?alt=media&token=<uuid>
 * Checking only the host is not enough: a user could point their avatar at
 * someone else's file, and a later delete (which removes the file a row points
 * at) would then delete that other user's image. So the folder must belong to
 * the authenticated caller, passed in by validate() as context.firebaseUid.
 *
 * Inline `data:image/*;base64,...` values (the pre-#45 format) are no longer
 * accepted. Existing rows were moved to Storage by
 * scripts/backfillImagesToStorage.js (2026-09-26). The browser uploads to
 * Storage itself (frontend/src/utils/imageUpload.js) and sends only the URL.
 *
 * Arbitrary external http(s) URLs stay rejected, because these columns render
 * as <img> sources on pages that list many users:
 *   - a tracking pixel: the host learns the IP, User-Agent and Referer of every
 *     visitor who merely browses a listing containing that image;
 *   - unreviewable content: the host can swap the image after moderation;
 *   - a latent SSRF sink the moment server-side code fetches these columns.
 * Our own bucket has none of these problems: we control it, and Storage rules
 * only let a user write under users/<their uid>/.
 *
 * `Joi.string().uri()` is not a substitute: it validates URI *syntax*, so it
 * accepts `javascript:alert(1)` and `data:text/html;base64,...`.
 *
 * NOTE: signup stores the Google account picture, an https URL, straight into
 * users.avatar_url (authController). That path does not go through this
 * validator — the value comes from a verified Firebase token, not user input.
 */

const STORAGE_HOST = 'firebasestorage.googleapis.com';
const IMAGE_KINDS = ['avatar', 'banner', 'board'];
// users/<firebase uid>/<kind>/<id>.<ext> — must match storage.rules.
const OBJECT_NAME_RE = /^users\/([A-Za-z0-9]{1,128})\/(avatar|banner|board)\/[A-Za-z0-9-]{1,64}\.(?:jpg|jpeg|png|webp)$/;
const TOKEN_RE = /^[A-Za-z0-9-]{1,64}$/;
const STORAGE_URL_MAX = 500;

/**
 * Parse a download URL for our bucket.
 * Returns { objectName, uid, kind } or null if it is not exactly that shape.
 */
const parseStorageUrl = (value, bucket = FIREBASE_STORAGE_BUCKET) => {
  if (typeof value !== 'string' || value.length > STORAGE_URL_MAX) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== STORAGE_HOST || url.port || url.username || url.password || url.hash) return null;

  const prefix = `/v0/b/${bucket}/o/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const encoded = url.pathname.slice(prefix.length);
  // The object name is one encoded path segment; a raw "/" means it isn't.
  if (!encoded || encoded.includes('/')) return null;
  let objectName;
  try { objectName = decodeURIComponent(encoded); } catch { return null; }
  const m = OBJECT_NAME_RE.exec(objectName);
  if (!m) return null;

  const params = [...url.searchParams.keys()];
  if (params.length !== 2 || url.searchParams.get('alt') !== 'media' || !TOKEN_RE.test(url.searchParams.get('token') || '')) return null;

  return { objectName, uid: m[1], kind: m[2] };
};

/**
 * Joi schema for one image column. `kind` is the Storage folder this field's
 * files must live in ('avatar' | 'banner' | 'board').
 */
const imageSource = (kind) => {
  if (!IMAGE_KINDS.includes(kind)) throw new Error(`imageSource: unknown kind ${kind}`);
  return Joi.string()
    .max(STORAGE_URL_MAX)
    .custom((value, helpers) => {
      const parsed = parseStorageUrl(value);
      const uid = helpers.prefs.context?.firebaseUid;
      if (parsed && uid && parsed.uid === uid && parsed.kind === kind) return value;
      return helpers.error('image.source');
    })
    .messages({
      'image.source': '{{#label}} must be an image uploaded to your own account. External URLs are not accepted.',
    });
};

module.exports = { imageSource, parseStorageUrl, IMAGE_KINDS };
