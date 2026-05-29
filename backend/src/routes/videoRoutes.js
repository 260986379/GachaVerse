const router = require('express').Router();
const { addFavorite, removeFavorite, reorderFavorites, getMyFavorites } = require('../controllers/videoFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',               authenticateToken, getMyFavorites);
router.patch('/favorites/reorder',     authenticateToken, reorderFavorites);
router.post('/:id/favorite',           authenticateToken, addFavorite);
router.delete('/:id/favorite',         authenticateToken, removeFavorite);

module.exports = router;
