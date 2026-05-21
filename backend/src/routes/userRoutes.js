const router = require('express').Router();
const { getUserProfile, getUserGames, addUserGame, removeUserGame } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/:id', getUserProfile);
router.get('/:id/games', getUserGames);
router.post('/me/games', authenticateToken, addUserGame);
router.delete('/me/games/:id', authenticateToken, removeUserGame);

module.exports = router;
