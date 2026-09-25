const Joi = require('joi');
const { IMAGE_DATA_URL_MAX } = require('./limits');

/**
 * Validator for user-writable image columns: boards.image_url,
 * users.avatar_url, users.banner_url.
 *
 * Only inline `data:image/*;base64,...` values are accepted. External http(s)
 * URLs are deliberately rejected, because these columns are rendered as <img>
 * sources and CSS background-images on pages that list many users (community,
 * gallery, explore, search). An externally hosted value would mean:
 *
 *   - a tracking pixel: the host learns the IP, User-Agent and Referer of every
 *     user who merely browses a listing containing that avatar or banner;
 *   - unreviewable content: the host can serve a clean image during moderation
 *     and swap it afterwards, which a stored data URL cannot do;
 *   - a latent SSRF sink the moment any server-side code fetches these columns
 *     (thumbnailing, moderation, or migrating these images out of Postgres).
 *
 * `Joi.string().uri()` is not a substitute: it validates URI *syntax*, so it
 * accepts `javascript:alert(1)` and `data:text/html;base64,...`.
 *
 * NOTE: signup stores the Google account picture, an https URL, straight into
 * users.avatar_url (authController). That path does not go through this
 * validator and is unaffected — the value comes from a verified Firebase token,
 * not from user input. Existing http avatars also keep rendering, since this
 * only applies on write.
 *
 * To allow external URLs again, add an http(s) branch here AND a host allowlist
 * — re-opening it without one reinstates every problem listed above.
 */

// SVG is excluded on purpose: it is scriptable, so it is not a safe "image".
const ALLOWED_IMAGE_SUBTYPES = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif'];

// Single character class with one quantifier — linear, no backtracking risk on
// the multi-hundred-KB strings these fields carry.
const DATA_URL_RE = new RegExp(
  `^data:image/(?:${ALLOWED_IMAGE_SUBTYPES.join('|')});base64,[A-Za-z0-9+/]+={0,2}$`,
  'i'
);

const imageSource = Joi.string()
  .max(IMAGE_DATA_URL_MAX)
  .pattern(DATA_URL_RE)
  .messages({
    'string.pattern.base':
      '{{#label}} must be an uploaded image (data:image/... base64). External URLs are not accepted.',
  });

module.exports = { imageSource, ALLOWED_IMAGE_SUBTYPES, DATA_URL_RE };
