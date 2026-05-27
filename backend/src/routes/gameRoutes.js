const router = require('express').Router();
const { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt, getGameBanners, getZZZPlayer } = require('../controllers/gameController');
const { getCommunityFeed } = require('../controllers/videoFavoriteController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', getAllGames);
router.get('/:id', getGameById);
router.get('/:id/characters', getCharactersByGameId);
router.get('/:id/news', getGameNews);
router.get('/:id/media', getGameMedia);
router.get('/:id/art', getGameArt);
router.get('/:id/banners', getGameBanners);
router.get('/:id/player/:uid', getZZZPlayer);
router.get('/:gameId/community-feed', optionalAuth, getCommunityFeed);

module.exports = router;
