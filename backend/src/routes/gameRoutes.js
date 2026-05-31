const router = require('express').Router();
const { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt, getGameBanners, getPlayer, getLatestVideoDates } = require('../controllers/gameController');

router.get('/', getAllGames);
router.get('/latest-video-dates', getLatestVideoDates);
router.get('/:id', getGameById);
router.get('/:id/characters', getCharactersByGameId);
router.get('/:id/news', getGameNews);
router.get('/:id/media', getGameMedia);
router.get('/:id/art', getGameArt);
router.get('/:id/banners', getGameBanners);
router.get('/:id/player/:uid', getPlayer);

module.exports = router;
