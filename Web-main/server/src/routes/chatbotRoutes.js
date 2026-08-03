const express = require('express');
const router  = express.Router();

const chatbotController     = require('../controllers/chatbotController');
const chatHistoryController = require('../controllers/chatHistoryController');
const { authenticateToken, requireRole, decodeTokenOptional } = require('../middlewares/authMiddleware');

// ── POST /api/chatbot/message ──────────────────────────────────────────────────
// Xử lý chat và lưu lịch sử được tích hợp hoàn toàn trong chatbotController.
// decodeTokenOptional: không yêu cầu đăng nhập — khách vẫn dùng được chatbot.
router.post('/message', decodeTokenOptional, chatbotController.processMessage);

// ── Chat History API ───────────────────────────────────────────────────────────
router.get('/history',    authenticateToken, chatHistoryController.getHistory);
router.delete('/history', authenticateToken, chatHistoryController.deleteHistory);

// ── Admin: Cấu hình Chatbot ────────────────────────────────────────────────────
router.get('/config', authenticateToken, requireRole(['admin']), chatbotController.getConfig);
router.put('/config', authenticateToken, requireRole(['admin']), chatbotController.updateConfig);

// ── Admin: Lịch sử Chatbot toàn hệ thống ─────────────────────────────────────────
router.get('/admin/history', authenticateToken, requireRole(['admin']), chatbotController.getAdminChatHistory);
router.get('/admin/history/details', authenticateToken, requireRole(['admin']), chatbotController.getAdminSessionDetails);

module.exports = router;
