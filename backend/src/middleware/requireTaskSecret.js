const crypto = require('crypto');
const config = require('../config');

/**
 * Guards machine-only endpoints (/internal/* and /api/admin/*) with a shared
 * secret sent as "Authorization: Bearer <TASK_SECRET>".
 *
 * Fails closed: if TASK_SECRET is not configured the route is unreachable
 * rather than open.
 */
const requireTaskSecret = (req, res, next) => {
  if (!config.TASK_SECRET) return res.status(503).json({ error: 'TASK_SECRET not configured' });

  const expected = Buffer.from(`Bearer ${config.TASK_SECRET}`);
  const provided = Buffer.from(req.headers['authorization'] || '');

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

module.exports = requireTaskSecret;
