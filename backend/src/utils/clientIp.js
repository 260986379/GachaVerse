const { isGoogleIp } = require('./googleRanges');

/**
 * Resolving the end user's IP, and refusing to trust a forgeable one.
 *
 * Two ways a request reaches this service, measured against production:
 *
 *   via Firebase Hosting (every real user — firebase.json rewrites /api/**)
 *     X-Forwarded-For starts with the end user's address, set by Google's edge.
 *     Firebase discards any X-Forwarded-For the caller sent, so that first entry
 *     cannot be forged. Cloud Run's own peer (a Google edge address such as
 *     66.102.8.167) is appended after it.
 *
 *   direct to the Cloud Run URL (bypasses Firebase entirely)
 *     Whatever the caller sent is kept, and Cloud Run APPENDS the real peer:
 *       no forgery ->  ["203.0.113.9"]
 *       forged     ->  ["10.5.5.9", "203.0.113.9"]   <- real peer still last
 *
 * So the LAST hop is always the address Cloud Run actually received the
 * connection from, and is never client-controlled. That gives a reliable test:
 *
 *   last hop is a Google address  -> arrived through Google's edge, so the
 *                                    FIRST hop is the end user (unforgeable)
 *   last hop is anything else     -> direct hit, so the LAST hop is the caller
 *                                    and any leading entries are forged
 *
 * Reading the first entry unconditionally (the previous behaviour) let anyone
 * hitting the Cloud Run URL pick their own rate-limit bucket. Reading the last
 * entry unconditionally would put every Firebase-proxied user in one shared
 * bucket, throttling the whole site as a single client.
 *
 * CLIENT_IP_SOURCE overrides the heuristic without a redeploy:
 *   auto (default) — the rule above
 *   first / last   — force one end of the chain
 *   socket         — ignore X-Forwarded-For entirely
 */

const SOURCE = (process.env.CLIENT_IP_SOURCE || 'auto').toLowerCase();

const parseForwardedFor = (req) => {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff !== 'string' || !xff.trim()) return [];
  return xff.split(',').map((s) => s.trim()).filter(Boolean);
};

const clientIp = (req) => {
  const socketAddr = req.socket?.remoteAddress || req.ip || 'unknown';
  if (SOURCE === 'socket') return socketAddr;

  const hops = parseForwardedFor(req);
  if (!hops.length) return socketAddr;

  const first = hops[0];
  const last = hops[hops.length - 1];
  if (SOURCE === 'first') return first;
  if (SOURCE === 'last') return last;

  const lastIsGoogle = isGoogleIp(last);

  // Ranges not loaded yet (startup, or the fetch is failing). Assume proxied and
  // use the first hop — the pre-existing behaviour. Deliberately the available
  // choice rather than the strict one: guessing "direct" here would collapse
  // every Firebase-proxied user onto one shared edge address and rate-limit the
  // entire site as a single client.
  if (lastIsGoogle === null) return first;

  return lastIsGoogle ? first : last;
};

module.exports = { clientIp, parseForwardedFor, CLIENT_IP_SOURCE: SOURCE };
