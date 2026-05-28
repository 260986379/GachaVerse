const router = require('express').Router();
const { toggleFavChar, getMyFavChars } = require('../controllers/characterFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',     authenticateToken, getMyFavChars);
router.post('/:id/favorite', authenticateToken, toggleFavChar);

module.exports = router;
