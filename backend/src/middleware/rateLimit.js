const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { clientIp } = require('../utils/clientIp');

/**
 * Global per-IP rate limiting.
 *
 * Mounted on /api only. /internal is deliberately excluded: it is reached by
 * Cloud Scheduler and Cloud Tasks from rotating Google IPs, is already guarded
 * by TASK_SECRET, and bursts five requests on the hour.
 *
 * Keys come from utils/clientIp rather than req.ip, because Firebase Hosting
 * proxies /api/** and req.ip would be a shared Google edge address. IPv6
 * callers are grouped per /56 via ipKeyGenerator, so one client cannot cycle
 * through addresses in its own prefix to multiply its budget.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const MAX       = Number(process.env.RATE_LIMIT_MAX)       || 100;

const keyGenerator = (req) => ipKeyGenerator(clientIp(req));

const jsonTooMany = (req, res) => {
  const retryAfterSec = Math.max(1, Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 60);
  res.set('Retry-After', String(retryAfterSec));
  // JSON, not the library's plain-text default: the frontend reads data.message.
  res.status(429).json({
    message: 'Too many requests. Please slow down and try again shortly.',
    retryAfter: retryAfterSec,
  });
};

const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX,
  keyGenerator,
  handler: jsonTooMany,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Admin routes already require TASK_SECRET and are run by hand; a seed or
  // backfill should not be throttled.
  skip: (req) => req.path.startsWith('/admin'),
  // We read X-Forwarded-For ourselves via clientIp, so the library's
  // trust-proxy heuristics do not apply.
  validate: { trustProxy: false, xForwardedForHeader: false },
});

/**
 * Tighter limit for anonymous suggestion submissions.
 *
 * The global /api limit (100/min) is far too generous here: submitting a
 * suggestion is a deliberate, rare action, so 100/min leaves room for ~6000
 * spam rows an hour. This caps it at 10/hour.
 *
 * Keyed by user id when the submitter is logged in, falling back to IP.
 * That means a household or campus sharing one IP does not have one person's
 * submissions block everyone else's, and a logged-in spammer is tracked by
 * account rather than by an address they can rotate.
 *
 * Must be mounted AFTER optionalAuth so req.user is populated.
 */
const SUGGESTION_WINDOW_MS = Number(process.env.SUGGESTION_RATE_WINDOW_MS) || 60 * 60 * 1000;
const SUGGESTION_MAX       = Number(process.env.SUGGESTION_RATE_MAX)       || 10;

const suggestionLimiter = rateLimit({
  windowMs: SUGGESTION_WINDOW_MS,
  limit: SUGGESTION_MAX,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : `ip:${ipKeyGenerator(clientIp(req))}`,
  handler: (req, res) => {
    const retryAfterSec = Math.max(1, Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 3600);
    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({
      message: 'You have submitted too many suggestions. Please try again later.',
      retryAfter: retryAfterSec,
    });
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
});

module.exports = { apiLimiter, suggestionLimiter, WINDOW_MS, MAX, SUGGESTION_WINDOW_MS, SUGGESTION_MAX };
