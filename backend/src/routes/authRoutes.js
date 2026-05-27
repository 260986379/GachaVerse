const router = require('express').Router();
const { syncUser, getMe } = require('../controllers/authController');
const { authenticateToken, authenticateFirebase } = require('../middleware/auth');

// Called by frontend after Firebase sign-in — creates or fetches user row
router.post('/sync', authenticateFirebase, syncUser);

// Returns the fully hydrated profile for the logged-in user
router.get('/me', authenticateToken, getMe);

module.exports = router;
