const router = require('express').Router();
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { suggestionLimiter } = require('../middleware/rateLimit');
const {
  submitSuggestion, getSuggestions, resolveSuggestion, requireMod,
  submitSuggestionSchema,
} = require('../controllers/suggestionController');

// optionalAuth first so the limiter can key on req.user; validation before the
// limiter so a malformed submission (which never inserts a row) does not spend
// the caller's budget. Invalid-body floods are still capped by the global limit.
router.post('/',     optionalAuth, validate(submitSuggestionSchema), suggestionLimiter, submitSuggestion);
router.get('/',      authenticateToken, requireMod,         getSuggestions);
router.patch('/:id', authenticateToken, requireMod,         resolveSuggestion);

module.exports = router;
