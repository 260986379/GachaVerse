/**
 * Resolving the end user's IP behind Firebase Hosting.
 *
 * Production traffic is: user -> Firebase Hosting (Google edge) -> Cloud Run.
 * The `/api/**` rewrite in firebase.json means Cloud Run's immediate peer is a
 * Google CDN node shared by every visitor — Cloud Run request logs show
 * remoteIp values like 66.102.8.167 for proxied requests. Keying a rate limiter
 * on that address would lump all users into one bucket.
 *
 * The end user's address is therefore read from X-Forwarded-For. Google's edge
 * puts the originating client FIRST, so that is the entry we use.
 *
 * Caveat: Cloud Run ingress is currently "all", so the service is also
 * reachable directly, where a caller can forge X-Forwarded-For and pick their
 * own bucket. Restricting ingress so only Firebase Hosting can reach the
 * service closes that path. CLIENT_IP_SOURCE allows flipping strategy without
 * a redeploy if the header shape ever differs from the above.
 *
 *   first  (default) — leftmost XFF entry: the real client behind Google's edge
 *   last             — rightmost XFF entry: correct only for direct-to-Cloud-Run
 *   socket           — ignore XFF entirely; use the TCP peer
 */

const SOURCE = (process.env.CLIENT_IP_SOURCE || 'first').toLowerCase();

const parseForwardedFor = (req) => {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff !== 'string' || !xff.trim()) return [];
  return xff.split(',').map(s => s.trim()).filter(Boolean);
};

const clientIp = (req) => {
  const socketAddr = req.socket?.remoteAddress || req.ip || 'unknown';
  if (SOURCE === 'socket') return socketAddr;

  const hops = parseForwardedFor(req);
  if (!hops.length) return socketAddr;

  return SOURCE === 'last' ? hops[hops.length - 1] : hops[0];
};

module.exports = { clientIp, parseForwardedFor, CLIENT_IP_SOURCE: SOURCE };
