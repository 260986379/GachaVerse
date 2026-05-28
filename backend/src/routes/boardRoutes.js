const router = require('express').Router();
const { getBoards, addBoard, deleteBoard, getBoardsByGame,
        getComments, addComment, deleteComment } = require('../controllers/boardController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.get('/game/:gameId',                    getBoardsByGame);
router.get('/user/:userId',                    getBoards);
router.post('/',                               authenticateToken, addBoard);
router.delete('/:id',                          authenticateToken, deleteBoard);

// Comments
router.get('/:id/comments',                    optionalAuth, getComments);
router.post('/:id/comments',                   authenticateToken, addComment);
router.delete('/:id/comments/:commentId',      authenticateToken, deleteComment);

module.exports = router;
