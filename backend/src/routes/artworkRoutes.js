const router = require('express').Router();
const { addFavArtwork, removeFavArtwork, reorderFavArtworks, getMyFavArtworks } = require('../controllers/artworkFavoriteController');
const { authenticateToken } = require('../middleware/auth');

router.get('/favorites',               authenticateToken, getMyFavArtworks);
router.patch('/favorites/reorder',     authenticateToken, reorderFavArtworks);
router.post('/:id/favorite',           authenticateToken, addFavArtwork);
router.delete('/:id/favorite',         authenticateToken, removeFavArtwork);

module.exports = router;
