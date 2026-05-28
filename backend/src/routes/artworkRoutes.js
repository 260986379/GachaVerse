const router = require('express').Router();
const { toggleFavArtwork, getMyFavArtworks } = require('../controllers/artworkFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',     authenticateToken, getMyFavArtworks);
router.post('/:id/favorite', authenticateToken, toggleFavArtwork);

module.exports = router;
