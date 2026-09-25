const router = require('express').Router();
const { getBoards, addBoard, deleteBoard, getAllBoards, getBoardsByGame,
        getComments, addComment, deleteComment,
        addBoardSchema, addBoardCommentSchema } = require('../controllers/boardController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.get('/all',                             getAllBoards);
router.get('/game/:gameId',                    getBoardsByGame);
router.get('/user/:userId',                    getBoards);
router.post('/',                               authenticateToken, validate(addBoardSchema), addBoard);
router.delete('/:id',                          authenticateToken, deleteBoard);

// Comments
router.get('/:id/comments',                    optionalAuth, getComments);
router.post('/:id/comments',                   authenticateToken, validate(addBoardCommentSchema), addComment);
router.delete('/:id/comments/:commentId',      authenticateToken, deleteComment);

module.exports = router;
