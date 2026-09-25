/**
 * Length caps for user-supplied content.
 *
 * express.json accepts 10mb (app.js), so without these a single authenticated
 * request can push megabytes of text into a column. Client-side maxLength
 * attributes are not a control — they are trivially bypassed — so these are the
 * server-side backstop.
 *
 * Text caps sit above the corresponding input limits in the UI so existing
 * flows are unaffected: the bio textarea is maxLength 300 against a 500 cap,
 * the username input maxLength 30 against a 30 cap.
 */
module.exports = {
  USERNAME_MAX:   30,
  BIO_MAX:        500,
  CAPTION_MAX:    500,
  COMMENT_MAX:    2000,
  REVIEW_BODY_MAX: 500,
  GAME_LABEL_MAX: 100,

  /**
   * Avatars, banners and board images are submitted inline as base64 data URLs
   * (see compressImage in the frontend), so this cannot be a short limit.
   * ~2,000,000 chars is roughly 1.5MB of image data — comfortable headroom over
   * the largest the client produces (900x1400 @ 0.88 quality) while still
   * bounding what was previously only limited by the 10mb body cap.
   */
  IMAGE_DATA_URL_MAX: 2000000,
};
