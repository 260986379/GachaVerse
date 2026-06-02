const router = require('express').Router();
const {
  createPost, getAllPosts, getPostById, getPostComments,
  editPost, deletePost,
  createPostSchema, editPostSchema,
} = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.post('/',          authenticateToken, validate(createPostSchema), createPost);
router.get('/',           getAllPosts);
router.get('/:id',        getPostById);
router.get('/:id/comments', getPostComments);
router.put('/:id',        authenticateToken, validate(editPostSchema), editPost);
router.delete('/:id',     authenticateToken, deletePost);

module.exports = router;
