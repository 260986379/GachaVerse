const router = require('express').Router();
const { getBoards, addBoard, deleteBoard, getAllBoards, getBoardsByGame,
        getComments, addComment, deleteComment,
        addBoardSchema, addBoardCommentSchema } = require('../controllers/boardController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { publicCache } = require('../middleware/cacheControl');

// CDN-cached for 60s (#49): same for every viewer; a new board shows up for others within a minute.
router.get('/all',                             publicCache(60), getAllBoards);
router.get('/game/:gameId',                    publicCache(60), getBoardsByGame);
router.get('/user/:userId',                    getBoards);
router.post('/',                               authenticateToken, validate(addBoardSchema), addBoard);
router.delete('/:id',                          authenticateToken, deleteBoard);

// Comments
router.get('/:id/comments',                    optionalAuth, getComments);
router.post('/:id/comments',                   authenticateToken, validate(addBoardCommentSchema), addComment);
router.delete('/:id/comments/:commentId',      authenticateToken, deleteComment);

module.exports = router;
