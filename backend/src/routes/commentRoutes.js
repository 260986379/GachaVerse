const router = require('express').Router();
const { createComment, createCommentSchema } = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.post('/:postId', authenticateToken, validate(createCommentSchema), createComment);

module.exports = router;
