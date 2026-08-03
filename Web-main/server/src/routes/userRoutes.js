const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, requireRole(['admin']), userController.getUsers);
router.put('/:id/balance', authenticateToken, requireRole(['admin']), userController.updateUserBalance);
router.put('/:id/status', authenticateToken, requireRole(['admin']), userController.updateUserStatus);
router.put('/:id', authenticateToken, requireRole(['admin']), userController.updateUser);

module.exports = router;
