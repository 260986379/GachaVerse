const router = require('express').Router();
const { toggleFavorite, getMyFavorites } = require('../controllers/videoFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',      authenticateToken, getMyFavorites);
router.post('/:id/favorite',  authenticateToken, toggleFavorite);

module.exports = router;
