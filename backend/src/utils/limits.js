/**
 * Length caps for user-supplied content.
 *
 * express.json accepts up to 100kb (app.js), so without these a single
 * authenticated request could still push ~100KB of text into a column.
 * Client-side maxLength attributes are not a control — they are trivially
 * bypassed — so these are the server-side backstop.
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
  // Image columns now hold short Storage URLs (#45); see utils/imageSource.js.
};
