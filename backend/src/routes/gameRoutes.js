const router = require('express').Router();
const { getAllGames, getGameById, getCharactersByGameId, getGameNews, getGameMedia, getGameArt } = require('../controllers/gameController');

router.get('/', getAllGames);
router.get('/:id', getGameById);
router.get('/:id/characters', getCharactersByGameId);
router.get('/:id/news', getGameNews);
router.get('/:id/media', getGameMedia);
router.get('/:id/art', getGameArt);

module.exports = router;
