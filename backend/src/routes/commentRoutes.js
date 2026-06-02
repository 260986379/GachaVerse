const router = require('express').Router();
const {
  createComment, editComment, deleteComment,
  createCommentSchema, editCommentSchema,
} = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.post('/:postId',   authenticateToken, validate(createCommentSchema), createComment);
router.put('/:id',        authenticateToken, validate(editCommentSchema),   editComment);
router.delete('/:id',     authenticateToken, deleteComment);

module.exports = router;
