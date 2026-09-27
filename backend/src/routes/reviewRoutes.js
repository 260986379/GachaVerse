const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { anonymousCache } = require('../middleware/cacheControl');
const { getReviews, upsertReview, deleteReview, toggleUpvote, getUserReviews, getUserStats, upsertReviewSchema } = require('../controllers/reviewController');

// Fixed-segment routes must come before /:gameId to avoid param conflicts
router.get('/user/:userId/stats', getUserStats);
router.get('/user/:userId', getUserReviews);
router.delete('/review/:reviewId', authenticateToken, deleteReview);
router.post('/review/:reviewId/upvote', authenticateToken, toggleUpvote);

// Signed-out views are CDN-cached for 60s (#49); signed-in ones carry the viewer's
// own review and upvotes, so they stay private.
router.get('/:gameId', anonymousCache(60), optionalAuth, getReviews);
router.post('/:gameId', authenticateToken, validate(upsertReviewSchema), upsertReview);

module.exports = router;
