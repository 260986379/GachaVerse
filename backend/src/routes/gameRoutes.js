const router = require('express').Router();
const { publicCache } = require('../middleware/cacheControl');
const { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt, getAllArt, getTrendingGames, getLatestVideoDates } = require('../controllers/gameController');

// CDN-cached (#49): identical for every viewer and slow-changing.
router.get('/', publicCache(300), getAllGames);
router.get('/trending',           publicCache(1800), getTrendingGames);
router.get('/latest-video-dates', getLatestVideoDates);
router.get('/art/all',            getAllArt);
router.get('/:id', publicCache(300), getGameById);
router.get('/:id/characters', publicCache(600), getCharactersByGameId);
router.get('/:id/news', getGameNews);
router.get('/:id/media', publicCache(1800), getGameMedia);
router.get('/:id/art', publicCache(300), getGameArt);

module.exports = router;
