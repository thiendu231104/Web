const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, transactionController.getTransactions);
router.post('/deposit/pending', authenticateToken, transactionController.createPendingDeposit);
router.post('/deposit/cancel', authenticateToken, transactionController.cancelDeposit);
router.delete('/', authenticateToken, transactionController.clearTransactions);
router.get('/admin/stats', authenticateToken, requireRole(['admin']), transactionController.getAdminStats);
router.get('/admin/stats-cards', authenticateToken, requireRole(['admin']), transactionController.getAdminStatsCards);
router.get('/admin/revenue-chart', authenticateToken, requireRole(['admin']), transactionController.getAdminRevenueTrends);
router.get('/admin/recent-transactions', authenticateToken, requireRole(['admin']), transactionController.getAdminRecentTransactions);
router.get('/admin/deposits', authenticateToken, requireRole(['admin']), transactionController.getAdminDeposits);

module.exports = router;
