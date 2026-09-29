const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, createPortalSession } = require('../controllers/billingController');

// The Stripe webhook is mounted separately in app.js: it needs the raw body
// and is called by Stripe, so it skips express.json(), the rate limit and auth.
router.post('/checkout', authenticateToken, createCheckoutSession);
router.post('/portal',   authenticateToken, createPortalSession);

module.exports = router;
