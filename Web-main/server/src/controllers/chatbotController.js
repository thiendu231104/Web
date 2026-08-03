/**
 * chatbotController.js — Hard-controlled RAG Chatbot Controller
 *
 * Luồng xử lý request chat chính (7 bước):
 *   B0. OFF-TOPIC     → Kiểm tra lạc đề (intent trống rỗng), trả về tĩnh, KHÔNG gọi AI
 *   B1. intentParser  → Phân tích câu hỏi thành object có cấu trúc
 *   B2. packageMatcher→ Query MongoDB lấy tối đa 3 gói cước chính xác
 *   B3. ZERO-MATCH    → Trả về văn bản tĩnh, TUYỆT ĐỐI không gọi AI
 *   B4. promptBuilder → Dựng prompt XML + System Prompt chống ảo giác
 *   B5. AI (Groq/Ollama)→ Sinh câu trả lời tự nhiên từ LLM
 *   B6. ChatHistory   → Lưu lịch sử + đầy đủ packages vào MongoDB
 */

const intentParser = require('../services/chatbot/intentParser');
const { matchPackages } = require('../services/chatbot/packageMatcher');
const { buildPrompt } = require('../services/chatbot/promptBuilder');
const { generateContent } = require('../services/ai/ai.service');
const chatbotService = require('../services/chatbotService');
const ChatHistory = require('../models/ChatHistory');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// ─── Constant messages ────────────────────────────────────────────────────────

/**
 * B3: Văn bản tĩnh trả về khi không tìm thấy gói phù hợp.
 * TUYỆT ĐỐI KHÔNG gọi Groq/Ollama trong trường hợp này.
 */
const NO_MATCH_TEXT =
  'Dạ, hiện tại hệ thống không tìm thấy gói cước nào đáp ứng chính xác các tiêu chí của bạn. ' +
  'Bạn có thể thay đổi khoảng giá, chu kỳ hoặc thực hiện Khảo sát chọn gói tại thanh menu để nhận đề xuất tốt nhất nhé!';

/**
 * B0: Văn bản tĩnh trả về khi người dùng hỏi lạc đề (không có bất kỳ tiêu chí viễn thông nào).
 */
const OFF_TOPIC_TEXT =
  'Dạ, tôi là trợ lý ảo chuyên phụ trách tư vấn các gói cước di động và dịch vụ viễn thông của Viettel. ' +
  'Hiện tại tôi chưa có dữ liệu để giải đáp các thắc mắc nằm ngoài phạm vi này, mong bạn thông cảm nhé!';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Phát hiện suggestedAction từ reply text.
 * Chỉ nhận diện hành động khảo sát; trả về null nếu không khớp.
 * suggestedAction mặc định là null — không tự động tạo link "Xem chi tiết gói".
 */
function detectSuggestedAction(replyText) {
  if (!replyText) return null;
  const lower = replyText.toLowerCase();

  // Nếu AI nhắc đến khảo sát
  if (/khảo\s*sát|survey/i.test(lower)) {
    return {
      type:    'survey',
      payload: '/survey',
      label:   'Làm khảo sát ngay'
    };
  }

  return null;
}

/**
 * Lưu một tin nhắn vào ChatHistory.
 * Đảm bảo hỗ trợ cả user đã đăng nhập và khách vãng lai.
 */
async function saveChatHistory(userId, sender, text, suggestedAction, packages, sessionId = null, guestInfo = null) {
  try {
    const source = userId ? 'user' : 'guest';
    await ChatHistory.create({
      userId: userId || null,
      sender,
      text,
      suggestedAction: suggestedAction || null,
      matchedPackages: packages || [],
      packages: packages || [],
      sessionId: userId ? null : sessionId,
      guestInfo: guestInfo || { phone: '', fullName: '' },
      source
    });
  } catch (err) {
    console.error('[ChatHistory] Lỗi lưu lịch sử:', err.message);
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

const chatbotController = {

  // ── Lấy cấu hình Chatbot (Admin) ──────────────────────────────────────────
  getConfig: async (req, res, next) => {
    try {
      const config = await chatbotService.getConfig();
      return res.status(200).json({
        success: true,
        message: 'Lấy cấu hình Chatbot thành công.',
        data: config
      });
    } catch (error) {
      next(error);
    }
  },

  // ── Cập nhật cấu hình Chatbot (Admin) ─────────────────────────────────────
  updateConfig: async (req, res, next) => {
    try {
      const { systemPrompt } = req.body;
      if (!systemPrompt) {
        return res.status(400).json({
          success: false,
          message: 'System prompt không được để trống.'
        });
      }

      const updated = await chatbotService.updateConfig(req.body);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình AI Chatbot thành công!',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  // ── Xử lý tin nhắn chat chính (2-Pass AI Pipeline) ───────────────────────────
  processMessage: async (req, res, next) => {
    const { message, guestInfo: bodyGuestInfo } = req.body;
    const userId = req.user ? req.user._id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.headers['session-id'] || null;
    const guestInfo = bodyGuestInfo || {
      phone: req.body.phone || '',
      fullName: req.body.fullName || req.body.full_name || ''
    };

    try {
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung tin nhắn không được để trống.'
        });
      }

      const trimmedMessage = message.trim();
      const result = await chatbotService.processMessage(trimmedMessage, userId, sessionId, guestInfo);

      return res.status(200).json({
        success: true,
        message: 'Xử lý tin nhắn thành công.',
        data: result
      });

    } catch (error) {
      console.error('[chatbotController] Unhandled error:', error);
      next(error);
    }
  },

  // ── Admin: Lấy danh sách hội thoại/tin nhắn Chatbot ─────────────────────────
  getAdminChatHistory: async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        source = 'all', 
        startDate, 
        endDate 
      } = req.query;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skipNum = (pageNum - 1) * limitNum;

      // Base query for user messages
      let query = { sender: 'user' };

      // Filter by source
      if (source === 'user') {
        query.source = 'user';
      } else if (source === 'guest') {
        query.source = 'guest';
      }

      // Filter by date range
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      // If search keyword is provided
      if (search.trim()) {
        const searchKeyword = search.trim();
        
        // Find matching Accounts
        const matchingAccounts = await Account.find({
          $or: [
            { fullname: new RegExp(searchKeyword, 'i') },
            { phone_number: new RegExp(searchKeyword, 'i') }
          ]
        }).select('_id').lean();
        
        const accountIds = matchingAccounts.map(acc => acc._id);

        query.$or = [
          { text: new RegExp(searchKeyword, 'i') },
          { sessionId: new RegExp(searchKeyword, 'i') },
          { userId: { $in: accountIds } },
          { 'guestInfo.phone': new RegExp(searchKeyword, 'i') },
          { 'guestInfo.fullName': new RegExp(searchKeyword, 'i') }
        ];
      }

      // Get total count
      const totalCount = await ChatHistory.countDocuments(query);

      // Get user messages
      const userMessages = await ChatHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .lean();

      const data = [];
      for (const msg of userMessages) {
        let botQuery = { 
          sender: 'bot',
          createdAt: { $gte: msg.createdAt }
        };
        
        if (msg.source === 'user' && msg.userId) {
          botQuery.userId = msg.userId;
        } else if (msg.source === 'guest' && msg.sessionId) {
          botQuery.sessionId = msg.sessionId;
        }

        const botReply = await ChatHistory.findOne(botQuery)
          .sort({ createdAt: 1 })
          .lean();

        let senderInfo = {
          fullName: 'Khách vãng lai',
          phone: '',
          role: 'guest',
          userId: msg.userId ? String(msg.userId) : null
        };

        if (msg.source === 'user' && msg.userId) {
          const user = await Account.findById(msg.userId).select('fullname phone_number').lean();
          if (user) {
            senderInfo.fullName = user.fullname;
            senderInfo.phone = user.phone_number;
            senderInfo.role = 'user';
            senderInfo.userId = String(user._id);
          }
        } else if (msg.source === 'guest') {
          senderInfo.fullName = msg.guestInfo?.fullName || 'Khách vãng lai';
          senderInfo.phone = msg.guestInfo?.phone || '';
          senderInfo.role = 'guest';
        }

        data.push({
          _id: msg._id,
          sessionId: msg.sessionId,
          senderInfo,
          source: msg.source,
          question: msg.text,
          answer: botReply ? botReply.text : 'Không có phản hồi',
          packages: botReply ? (botReply.packages || []) : [],
          createdAt: msg.createdAt
        });
      }

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // ── Admin: Lấy chi tiết đoạn chat theo sessionId hoặc userId ─────────────────
  getAdminSessionDetails: async (req, res, next) => {
    try {
      const { sessionId, userId } = req.query;
      const cleanSessionId = sessionId && String(sessionId).trim() !== '' ? String(sessionId).trim() : null;
      const cleanUserId = userId && String(userId).trim() !== '' ? String(userId).trim() : null;

      let query = {};
      if (cleanSessionId) {
        query.sessionId = cleanSessionId;
      } else if (cleanUserId) {
        // Ep kieu & lookup tai khoan an toan cho userId
        const isValidObjectId = mongoose.Types.ObjectId.isValid(cleanUserId);
        let foundAccount = null;

        if (isValidObjectId) {
          foundAccount = await Account.findById(cleanUserId).lean();
        }

        if (!foundAccount) {
          const numericUserId = parseInt(cleanUserId, 10);
          foundAccount = await Account.findOne({
            $or: [
              { phone_number: cleanUserId },
              ...(isNaN(numericUserId) ? [] : [{ user_id: numericUserId }]),
              { email: cleanUserId.toLowerCase() }
            ]
          }).lean();
        }

        if (foundAccount) {
          query.userId = foundAccount._id;
        } else if (isValidObjectId) {
          query.userId = cleanUserId;
        } else {
          // Tra cứu fallback theo SĐT khách vãng lai hoặc nội dung
          query.$or = [
            { 'guestInfo.phone': cleanUserId },
            { sessionId: cleanUserId }
          ];
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin sessionId hoặc userId để lấy chi tiết phiên chat.'
        });
      }

      // Query all messages, sorted by time
      const messages = await ChatHistory.find(query)
        .sort({ createdAt: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = chatbotController;
