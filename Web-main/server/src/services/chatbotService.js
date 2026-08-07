const ChatbotConfig = require('../models/ChatbotConfig');
const ChatHistory = require('../models/ChatHistory');
const intentParser = require('./chatbot/intentParser');
const { matchPackages } = require('./chatbot/packageMatcher');
const { buildPrompt } = require('./chatbot/promptBuilder');
const { generateContent } = require('./ai/ai.service');

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
   * Luồng xử lý Pure RAG Architecture Chatbot AI:
   * BƯỚC 1: intentParser.js (Pass 1 - Trích xuất JSON Intent)
   * BƯỚC 2: packageMatcher.js (Step 3 - Pure RAG Retrieval Top 3-5 gói cước liên quan nhất)
   * BƯỚC 3: promptBuilder.js & AI (Pass 2 - Grounded Response Generation) & Lưu ChatHistory
   */
  processMessage: async (message, userId = null, sessionId = null, guestInfo = null) => {
    console.time('[Chatbot Pure RAG] Pipeline Total');
    try {
      console.log('[Chatbot Pure RAG] Step 1: Receiving user message:', message);

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
      console.log('[Chatbot Pure RAG] Step 2: Pass 1 NLU Intent Extraction...');
      const intent = await intentParser(message, recentHistory);
      console.log('[Chatbot Pure RAG] Extracted Intent JSON:', JSON.stringify(intent));

      // BƯỚC 2: Pure RAG Package Retrieval
      console.log('[Chatbot Pure RAG] Step 3: Pure RAG Retrieval from MongoDB...');
      let matchedPackages = [];

      if (intent.is_general_or_greeting !== true) {
        const matchResult = await matchPackages(intent);
        matchedPackages = matchResult.packages || [];
      }
      console.log('[Chatbot Pure RAG] Matched packages count:', matchedPackages.length, matchedPackages.map(p => p.ma_goi));

      let replyText = '';
      if (intent.is_general_or_greeting === true) {
        console.log('[Chatbot Pure RAG] Bypassing packages. Generating greeting response...');
        const systemPrompt = "Bạn là Trợ lý tư vấn gói cước Viettel thân thiện, chuyên nghiệp. Hãy phản hồi ngắn gọn, lịch sự đối với các câu chào hỏi/tán gẫu và hướng người dùng hỏi về gói cước di động Viettel.";
        const userPrompt = `Lịch sử trò chuyện gần đây:
${recentHistory.length > 0 ? recentHistory.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') : '(Không có)'}

Tin nhắn mới nhất của người dùng: "${message}"`;
        replyText = await generateContent(userPrompt, systemPrompt);
      } else {
        // BƯỚC 3: Pass 2 Response Generation từ Pure Context
        console.log('[Chatbot Pure RAG] Step 4: Pass 2 Response Generation...');
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

      // Lưu câu trả lời của Bot vào MongoDB
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

      console.timeEnd('[Chatbot Pure RAG] Pipeline Total');

      return {
        success: true,
        text: replyText,
        message: replyText,
        packages: matchedPackages,
        recommendedPackages: matchedPackages,
        suggestedAction
      };

    } catch (error) {
      console.timeEnd('[Chatbot Pure RAG] Pipeline Total');
      console.error('[Chatbot Pure RAG] Pipeline Error:', error);
      return {
        success: false,
        text: 'Dạ, hiện tại hệ thống chatbot đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
        message: 'Dạ, hiện tại hệ thống chatbot đang gặp sự cố kết lộ. Vui lòng thử lại sau ít phút.',
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
