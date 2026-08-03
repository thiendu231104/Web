const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const { authenticateToken, decodeTokenOptional, requireRole } = require('../middlewares/authMiddleware');

// GET /api/survey/config (Công khai - lấy danh sách câu hỏi, có nhận diện user)
router.get('/config', decodeTokenOptional, surveyController.getConfig);

// POST /api/survey và /api/survey/recommend (Công khai/Có nhận diện - gửi câu trả lời và lấy kết quả)
router.post('/', decodeTokenOptional, surveyController.submitAnswers);
router.post('/recommend', decodeTokenOptional, surveyController.submitAnswers);

// Các endpoint yêu cầu đăng nhập
router.get('/history', authenticateToken, surveyController.getHistory);
router.get('/admin/history', authenticateToken, requireRole(['admin']), surveyController.getAdminHistory);
router.delete('/history', authenticateToken, surveyController.deleteHistory);

module.exports = router;
