const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread/count', authenticateToken, notificationController.getUnreadCount);
router.put('/read', authenticateToken, notificationController.markAllAsRead);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/', authenticateToken, notificationController.softDeleteAll);

module.exports = router;
