const router = require('express').Router();
const { addFavArtwork, removeFavArtwork, getMyFavArtworks } = require('../controllers/artworkFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',        authenticateToken, getMyFavArtworks);
router.post('/:id/favorite',    authenticateToken, addFavArtwork);
router.delete('/:id/favorite',  authenticateToken, removeFavArtwork);

module.exports = router;
