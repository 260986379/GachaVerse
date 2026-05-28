const router = require('express').Router();
const { getNotifications } = require('../controllers/notificationController');
const { getUserNotifications, markAllRead } = require('../controllers/userNotificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/',            getNotifications);           // public — game video feed
router.get('/social',      authenticateToken, getUserNotifications);  // personal
router.post('/social/read-all', authenticateToken, markAllRead);

module.exports = router;
