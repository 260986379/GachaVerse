const router = require('express').Router();
const { getAllGames, getGameById, getCharactersByGameId } = require('../controllers/gameController');

router.get('/', getAllGames);
router.get('/:id', getGameById);
router.get('/:id/characters', getCharactersByGameId);

module.exports = router;
