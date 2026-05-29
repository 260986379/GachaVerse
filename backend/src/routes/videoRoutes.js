const router = require('express').Router();
const { addFavorite, removeFavorite, getMyFavorites } = require('../controllers/videoFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',        authenticateToken, getMyFavorites);
router.post('/:id/favorite',    authenticateToken, addFavorite);
router.delete('/:id/favorite',  authenticateToken, removeFavorite);

module.exports = router;
