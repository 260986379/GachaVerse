const router = require('express').Router();
const { addFavChar, removeFavChar, reorderFavChars, getMyFavChars } = require('../controllers/characterFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',               authenticateToken, getMyFavChars);
router.patch('/favorites/reorder',     authenticateToken, reorderFavChars);
router.post('/:id/favorite',           authenticateToken, addFavChar);
router.delete('/:id/favorite',         authenticateToken, removeFavChar);

module.exports = router;
