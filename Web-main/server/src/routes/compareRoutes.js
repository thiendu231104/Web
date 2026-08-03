const express = require('express');
const router = express.Router();
const compareController = require('../controllers/compareController');
const { authenticateToken, requireRole, decodeTokenOptional } = require('../middlewares/authMiddleware');

// Endpoint to save/update a comparison session (accessible by guests & users)
router.post('/session', decodeTokenOptional, compareController.saveCompareSession);

// Endpoint to close a comparison session (sendBeacon / navigator safe)
router.post('/session/close', decodeTokenOptional, compareController.closeCompareSession);

// Endpoint to analyze package comparison using real AI LLM
router.post('/ai-analyze', decodeTokenOptional, compareController.analyzeCompareAI);

// Endpoint to fetch comparison analytics (accessible only by admin)
router.get('/analytics', authenticateToken, requireRole(['admin']), compareController.getCompareAnalytics);

module.exports = router;
