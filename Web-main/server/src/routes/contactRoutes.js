const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, requireRole, decodeTokenOptional } = require('../middlewares/authMiddleware');

// Public routes / member routes
router.post('/', decodeTokenOptional, contactController.createContact);
router.get('/my-requests', authenticateToken, contactController.getMyRequests);
router.get('/user-history', authenticateToken, contactController.getUserHistory);
router.post('/guest-history', contactController.getGuestHistory);
router.post('/guest-lookup', contactController.guestLookup);
router.get('/lookup', contactController.lookupContacts);
router.delete('/history-all', decodeTokenOptional, contactController.softDeleteAllHistory);
router.delete('/history/:id', decodeTokenOptional, contactController.softDeleteHistory);

// Admin-only routes
router.get('/', authenticateToken, requireRole(['admin']), contactController.getAdminContacts);
router.patch('/:id/reply', authenticateToken, requireRole(['admin']), contactController.updateContactReply);
router.delete('/:id', authenticateToken, requireRole(['admin']), contactController.deleteContact);

module.exports = router;
