const router = require('express').Router();
const { addFavChar, removeFavChar, getMyFavChars } = require('../controllers/characterFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',        authenticateToken, getMyFavChars);
router.post('/:id/favorite',    authenticateToken, addFavChar);
router.delete('/:id/favorite',  authenticateToken, removeFavChar);

module.exports = router;
