const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { fileReport, getReports, resolveReport, requireMod } = require('../controllers/reportController');

router.post('/',     authenticateToken, fileReport);
router.get('/',      authenticateToken, requireMod, getReports);
router.patch('/:id', authenticateToken, requireMod, resolveReport);

module.exports = router;
