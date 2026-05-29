const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { getReviews, upsertReview, deleteReview, toggleUpvote, getUserReviews, getUserStats } = require('../controllers/reviewController');

// Fixed-segment routes must come before /:gameId to avoid param conflicts
router.get('/user/:userId/stats', getUserStats);
router.get('/user/:userId', getUserReviews);
router.delete('/review/:reviewId', authenticateToken, deleteReview);
router.post('/review/:reviewId/upvote', authenticateToken, toggleUpvote);

router.get('/:gameId', optionalAuth, getReviews);
router.post('/:gameId', authenticateToken, upsertReview);

module.exports = router;
