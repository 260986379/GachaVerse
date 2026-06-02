const router = require('express').Router();
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { submitSuggestion, getSuggestions, resolveSuggestion, requireMod } = require('../controllers/suggestionController');

router.post('/',     optionalAuth,                          submitSuggestion);
router.get('/',      authenticateToken, requireMod,         getSuggestions);
router.patch('/:id', authenticateToken, requireMod,         resolveSuggestion);

module.exports = router;
