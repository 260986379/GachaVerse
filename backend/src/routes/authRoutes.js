const router = require('express').Router();
const { registerUser, loginUser, getMe, registerSchema, loginSchema } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/me', authenticateToken, getMe);

module.exports = router;
