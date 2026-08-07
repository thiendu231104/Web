const ChatbotConfig = require('../models/ChatbotConfig');
const ChatHistory = require('../models/ChatHistory');
const intentParser = require('./chatbot/intentParser');
const { matchPackages } = require('./chatbot/packageMatcher');
const { buildPrompt } = require('./chatbot/promptBuilder');
const { generateContent } = require('./ai/ai.service');
const { resolveSessionPackages } = require('./chatbot/sessionService');

const chatbotService = {
  getConfig: async () => {
    const config = await ChatbotConfig.findOne();
    if (!config) {
      return {
        systemPrompt: 'Bạn là Trợ lý tư vấn gói cước Viettel thân thiện, chuyên nghiệp...',
        trainingKeywords: []
      };
    }
    return config;
  },

  updateConfig: async (configData) => {
    let config = await ChatbotConfig.findOne();
    if (!config) {
      config = new ChatbotConfig({
        systemPrompt: configData.systemPrompt,
        trainingKeywords: configData.trainingKeywords || []
      });
    } else {
      config.systemPrompt = configData.systemPrompt;
      config.trainingKeywords = configData.trainingKeywords || [];
    }
    await config.save();
    return config;
  },

  /**
   * Luồng xử lý Session Memory RAG Chatbot AI:
   *
   * BƯỚC 1: intentParser.js (Pass 1 NLU — Trích xuất JSON Intent)
   * BƯỚC 2: sessionService.js (Session Memory — Xác định REFINEMENT hay NEW SESSION)
   *   - Nếu REFINEMENT: Lọc candidatePackages hiện tại theo requirement mới → KHÔNG query DB lại
   *   - Nếu NEW SESSION: Đóng session cũ → Query full DB → Tạo session mới → Lưu candidatePackageIds
   * BƯỚC 3: promptBuilder.js & AI (Pass 2 — Grounded Response từ packages đã resolve)
   * BƯỚC 4: Lưu ChatHistory
   */
  processMessage: async (message, userId = null, sessionId = null, guestInfo = null) => {
    console.time('[Chatbot Session RAG] Pipeline Total');
    try {
      console.log('[Chatbot Session RAG] Step 1: Receiving user message:', message);

      // Lấy lịch sử trò chuyện gần đây (10 câu gần nhất)
      let historyQuery = { isDeleted: { $ne: true } };
      if (userId) {
        historyQuery.userId = userId;
      } else if (sessionId) {
        historyQuery.sessionId = sessionId;
      } else {
        historyQuery = null;
      }

      let recentHistory = [];
      if (historyQuery) {
        try {
          const rawHistory = await ChatHistory.find(historyQuery)
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
          recentHistory = rawHistory.map(h => ({
            sender: h.sender,
            text: h.text
          }));
          recentHistory.reverse();
        } catch (historyQueryErr) {
          console.error('[Chatbot] Error querying conversation history:', historyQueryErr.message);
        }
      }

      // Lưu tin nhắn của người dùng vào MongoDB
      try {
        await ChatHistory.create({
          userId: userId || null,
          sender: 'user',
          text: message,
          sessionId: userId ? null : sessionId,
          guestInfo: guestInfo || { phone: '', fullName: '' },
          source: userId ? 'user' : 'guest'
        });
      } catch (historyErr) {
        console.error('[Chatbot] Error saving user chat history:', historyErr.message);
      }

      // BƯỚC 1: Pass 1 NLU Intent Extraction
      console.log('[Chatbot Session RAG] Step 2: Pass 1 NLU Intent Extraction...');
      const intent = await intentParser(message, recentHistory);
      console.log('[Chatbot Session RAG] Extracted Intent JSON:', JSON.stringify(intent));

      let matchedPackages = [];
      let sessionMode = 'NEW_SESSION';

      if (intent.is_general_or_greeting === true) {
        // Greeting: bỏ qua session logic, không cần package retrieval
        console.log('[Chatbot Session RAG] Greeting detected. Bypassing session & package retrieval.');
      } else {
        // BƯỚC 2: Session Memory Resolution
        console.log('[Chatbot Session RAG] Step 3: Session Memory Resolution...');

        /**
         * fullDbSearchFn — Pure RAG search trên toàn bộ MongoDB.
         * Được gọi khi cần tạo NEW SESSION hoặc không có session ACTIVE.
         * sessionService gọi hàm này một cách trừu tượng, không biết nội dung bên trong.
         */
        const fullDbSearchFn = async (requirements) => {
          const result = await matchPackages(requirements);
          return result.packages || [];
        };

        const sessionResult = await resolveSessionPackages(
          userId,
          sessionId,
          intent,
          fullDbSearchFn
        );

        matchedPackages = sessionResult.packages || [];
        sessionMode = sessionResult.sessionMode;

        console.log(`[Chatbot Session RAG] Session Mode: ${sessionMode} | Matched: ${matchedPackages.length} packages:`, matchedPackages.map(p => p.ma_goi));
      }

      // BƯỚC 3: Pass 2 Response Generation
      let replyText = '';
      if (intent.is_general_or_greeting === true) {
        const systemPrompt = 'Bạn là Trợ lý tư vấn gói cước Viettel thân thiện, chuyên nghiệp. Hãy phản hồi ngắn gọn, lịch sự đối với các câu chào hỏi/tán gẫu và hướng người dùng hỏi về gói cước di động Viettel.';
        const userPrompt = `Lịch sử trò chuyện gần đây:\n${recentHistory.length > 0 ? recentHistory.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') : '(Không có)'}\n\nTin nhắn mới nhất của người dùng: "${message}"`;
        replyText = await generateContent(userPrompt, systemPrompt);
      } else {
        console.log('[Chatbot Session RAG] Step 4: Pass 2 Response Generation...');
        const promptObj = buildPrompt(message, matchedPackages, intent, recentHistory);
        replyText = await generateContent(promptObj.userPrompt, promptObj.systemInstruction);
      }

      let suggestedAction = null;
      if (/khảo\s*sát|survey/i.test(replyText)) {
        suggestedAction = {
          type: 'survey',
          payload: '/survey',
          label: 'Làm khảo sát ngay'
        };
      }

      // BƯỚC 4: Lưu câu trả lời của Bot vào MongoDB
      try {
        await ChatHistory.create({
          userId: userId || null,
          sender: 'bot',
          text: replyText,
          suggestedAction: suggestedAction || null,
          matchedPackages: matchedPackages,
          packages: matchedPackages,
          sessionId: userId ? null : sessionId,
          guestInfo: guestInfo || { phone: '', fullName: '' },
          source: userId ? 'user' : 'guest'
        });
      } catch (historyErr) {
        console.error('[Chatbot] Error saving bot chat history:', historyErr.message);
      }

      console.timeEnd('[Chatbot Session RAG] Pipeline Total');

      return {
        success: true,
        text: replyText,
        message: replyText,
        packages: matchedPackages,
        recommendedPackages: matchedPackages,
        suggestedAction,
        sessionMode
      };

    } catch (error) {
      console.timeEnd('[Chatbot Session RAG] Pipeline Total');
      console.error('[Chatbot Session RAG] Pipeline Error:', error);
      return {
        success: false,
        text: 'Dạ, hiện tại hệ thống chatbot đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
        message: 'Dạ, hiện tại hệ thống chatbot đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
        packages: [],
        recommendedPackages: []
      };
    }
  },

  checkAndSeedChatbot: async () => {
    const count = await ChatbotConfig.countDocuments();
    if (count > 0) return;

    console.log('Seeding default Chatbot Configuration...');
    await ChatbotConfig.create({
      systemPrompt: 'Bạn là Trợ lý tư vấn gói cước Viettel thân thiện, chuyên nghiệp...',
      trainingKeywords: []
    });
    console.log('Successfully seeded Chatbot Configuration.');
  }
};

module.exports = chatbotService;
