const router = require('express').Router();
const { createPost, getAllPosts, getPostById, createPostSchema } = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.post('/', authenticateToken, validate(createPostSchema), createPost);
router.get('/', getAllPosts);
router.get('/:id', getPostById);

module.exports = router;
