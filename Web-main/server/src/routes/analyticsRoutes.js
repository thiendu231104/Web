const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { getAnalytics } = require('../controllers/analyticsController');

// GET /api/admin/analytics?range=today|7d|30d|all
router.get('/', authenticateToken, requireRole(['admin']), getAnalytics);

module.exports = router;
