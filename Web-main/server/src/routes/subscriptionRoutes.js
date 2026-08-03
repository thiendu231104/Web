const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken, decodeTokenOptional } = require('../middlewares/authMiddleware');

router.post('/check', authenticateToken, subscriptionController.check);
router.post('/register', authenticateToken, subscriptionController.register);
router.get('/active', authenticateToken, subscriptionController.getActive);
router.get('/history', authenticateToken, subscriptionController.getHistory);
router.delete('/history', authenticateToken, subscriptionController.clearHistory);
router.delete('/history/:id', authenticateToken, subscriptionController.deleteHistoryItem);
router.post('/renew', authenticateToken, subscriptionController.renew);
router.post('/toggle-auto-renew', authenticateToken, subscriptionController.toggleAutoRenew);
router.post('/cancel', authenticateToken, subscriptionController.cancel);
router.get('/dev/virtual-time', decodeTokenOptional, subscriptionController.getVirtualTime);
router.post('/dev/set-virtual-time', decodeTokenOptional, subscriptionController.setVirtualTime);
router.post('/dev/reset-virtual-time', decodeTokenOptional, subscriptionController.resetVirtualTime);

module.exports = router;
