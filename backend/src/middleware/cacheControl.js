/**
 * CDN caching for public GET endpoints (#49).
 *
 * Every /api request goes Firebase Hosting -> Cloud Run -> Neon. A response
 * marked `public, s-maxage=N` is kept by Firebase Hosting's CDN for N seconds,
 * so repeat views within that window never reach Cloud Run or the database:
 * faster pages, fewer billable requests, and Neon stays asleep longer (the
 * Free plan's monthly compute allowance is the site's tightest limit).
 *
 * Two flavours:
 *
 *   publicCache(s)     - the response is identical for every viewer.
 *
 *   anonymousCache(s)  - the response depends on who is asking (optionalAuth:
 *                        own review / upvote flags, Debug accounts shown to
 *                        mods). Only requests WITHOUT an Authorization header
 *                        are shareable; signed-in responses are `private,
 *                        no-store`. `Vary: Authorization` keeps the two apart
 *                        in the CDN, so a signed-in viewer is never served the
 *                        anonymous copy and vice versa.
 *
 * Only 200 responses are cacheable: an error or 404 must not be pinned in the
 * CDN, so any other status is rewritten to `no-store` as headers go out.
 *
 * Trade-off: new content (a board, a review, a new user) can take up to the
 * cache time to appear for OTHER visitors. The author's own view updates
 * immediately, because their requests are signed in (private) and the UI adds
 * their change locally.
 */

const cacheHeader = (seconds) => `public, max-age=${seconds}, s-maxage=${seconds}`;

// Swap in `no-store` if the response turns out not to be a 200. A 304 (the
// client's cached copy is still current) keeps the header, or revalidating
// would make the client discard a good copy.
const onlyCacheOk = (res) => {
  const writeHead = res.writeHead;
  res.writeHead = function (statusCode, ...rest) {
    const code = typeof statusCode === 'number' ? statusCode : res.statusCode;
    if (code !== 200 && code !== 304) res.setHeader('Cache-Control', 'no-store');
    return writeHead.call(this, statusCode, ...rest);
  };
};

const publicCache = (seconds) => (req, res, next) => {
  res.set('Cache-Control', cacheHeader(seconds));
  onlyCacheOk(res);
  next();
};

const anonymousCache = (seconds) => (req, res, next) => {
  res.vary('Authorization');
  res.set('Cache-Control', req.headers.authorization ? 'private, no-store' : cacheHeader(seconds));
  onlyCacheOk(res);
  next();
};

module.exports = { publicCache, anonymousCache };
