const router = require('express').Router();
const { getBoards, addBoard, deleteBoard, getBoardsByGame } = require('../controllers/boardController');
const { authenticateToken } = require('../middleware/auth');

router.get('/game/:gameId',  getBoardsByGame);
router.get('/user/:userId',  getBoards);
router.post('/',             authenticateToken, addBoard);
router.delete('/:id',        authenticateToken, deleteBoard);

module.exports = router;
