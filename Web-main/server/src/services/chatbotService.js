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
        systemPrompt: 'Bạn là trợ lý ảo thông minh Viettel AI...',
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
   * Luồng xử lý Chatbot 2-Pass AI Processing hoàn chỉnh:
   * BƯỚC 1: Cấu hình Môi trường & AI Provider (groq.provider.js / ai.service.js với llama-3.3-70b-versatile)
   * BƯỚC 2: intentParser.js (Lượt AI 1 - Trích xuất JSON)
   * BƯỚC 3: packageMatcher.js (Chuyển JSON thành MongoDB Query & Chấm điểm mềm Soft Scoring chọn 3-5 gói)
   * BƯỚC 4: promptBuilder.js & AI (Lượt AI 2 - Sinh câu trả lời từ Context XML) & Lưu MongoDB (chat_histories)
   */
  processMessage: async (message, userId = null, sessionId = null, guestInfo = null) => {
    console.time('[Chatbot 2-Pass AI] Pipeline Total');
    try {
      console.log('[Chatbot 2-Pass AI] Step 1: Receiving user message:', message);

      // Lấy lịch sử trò chuyện gần đây (10 câu gần nhất) trước khi lưu tin mới
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
          recentHistory.reverse(); // Sắp xếp lại từ cũ đến mới
        } catch (historyQueryErr) {
          console.error('[Chatbot] Error querying conversation history:', historyQueryErr.message);
        }
      }

      // Lưu tin nhắn của người dùng vào MongoDB collection `chat_histories`
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

      // BƯỚC 2: Lượt AI thứ 1 — Trích xuất JSON Intent từ câu nói người dùng (kèm lịch sử để giữ ngữ cảnh)
      console.log('[Chatbot 2-Pass AI] Step 2: Pass 1 AI Intent Extraction...');
      const intent = await intentParser(message, recentHistory);
      console.log('[Chatbot 2-Pass AI] Extracted Intent JSON:', JSON.stringify(intent));

      // BƯỚC 3: Khớp gói cước trong Database MongoDB bằng Soft Scoring
      console.log('[Chatbot 2-Pass AI] Step 3: MongoDB Package Soft Scoring & Matching...');
      let matchedPackages = [];
      if (intent.is_general_or_greeting !== true) {
        const matchResult = await matchPackages(intent);
        matchedPackages = matchResult.packages || [];
      }
      console.log('[Chatbot 2-Pass AI] Matched 3-5 top packages count:', matchedPackages.length, matchedPackages.map(p => p.ma_goi));

      let replyText = '';
      if (intent.is_general_or_greeting === true) {
        // Sinh phản hồi chào hỏi/chit-chat hoặc từ chối lạc đề thân thiện
        console.log('[Chatbot 2-Pass AI] Bypassing packages. Generating greeting/general response...');
        const systemPrompt = "Bạn là trợ lý ảo Viettel AI, chuyên tư vấn các gói cước di động và dịch vụ viễn thông Viettel. Hãy trả lời câu hỏi của khách hàng một cách thân thiện, lịch sự và tự nhiên. Nếu câu hỏi là lời chào/chit-chat, hãy phản hồi ngắn gọn và hướng người dùng hỏi về gói cước di động Viettel. Nếu câu hỏi lạc đề hoàn toàn khỏi viễn thông Viettel, hãy từ chối khéo léo và nhắc họ rằng bạn chỉ chuyên hỗ trợ các gói cước Viettel.";
        const userPrompt = `Lịch sử trò chuyện gần đây:
${recentHistory.length > 0 ? recentHistory.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') : '(Không có)'}

Tin nhắn mới nhất của người dùng: "${message}"`;
        replyText = await generateContent(userPrompt, systemPrompt);
      } else if (matchedPackages.length === 0) {
        replyText = 'Rất tiếc, hiện tại hệ thống Viettel không có gói cước nào đáp ứng chính xác nhu cầu của bạn. Xin vui lòng kiểm tra lại thông tin hoặc thay đổi tiêu chí tìm kiếm nhé!';
      } else {
        // BƯỚC 4: Lượt AI thứ 2 — Dựng Context & Sinh câu trả lời hoàn chỉnh
        console.log('[Chatbot 2-Pass AI] Step 4: Pass 2 AI Prompt Building & Response Generation...');
        const promptObj = buildPrompt(message, matchedPackages, intent, recentHistory);
        replyText = await generateContent(promptObj.userPrompt, promptObj.systemInstruction);
      }

      // Nhận diện suggestedAction nếu AI đề cập tới khảo sát
      let suggestedAction = null;
      if (/khảo\s*sát|survey/i.test(replyText)) {
        suggestedAction = {
          type: 'survey',
          payload: '/survey',
          label: 'Làm khảo sát ngay'
        };
      }

      // Lưu câu trả lời của Bot vào MongoDB collection `chat_histories`
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

      console.timeEnd('[Chatbot 2-Pass AI] Pipeline Total');

      return {
        success: true,
        text: replyText,
        message: replyText,
        packages: matchedPackages,
        recommendedPackages: matchedPackages,
        suggestedAction
      };

    } catch (error) {
      console.timeEnd('[Chatbot 2-Pass AI] Pipeline Total');
      console.error('[Chatbot 2-Pass AI] Pipeline Error:', error);
      return {
        success: false,
        text: 'Dạ, hiện tại hệ thống chatbot đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
        message: 'Dạ, hiện tại hệ thống chatbot đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.',
        packages: [],
        recommendedPackages: []
      };
    }
  },

  // Helper auto seed
  checkAndSeedChatbot: async () => {
    const count = await ChatbotConfig.countDocuments();
    if (count > 0) return;

    console.log('Seeding default Chatbot Configuration...');
    await ChatbotConfig.create({
      systemPrompt: 'Bạn là trợ lý ảo thông minh Viettel AI, chuyên tư vấn các gói cước di động phù hợp nhất với nhu cầu sử dụng mạng, cuộc gọi và mạng xã hội của khách hàng. Hãy trả lời thân thiện, ngắn gọn và cung cấp nút đăng ký nhanh cho người dùng.',
      trainingKeywords: []
    });
    console.log('Successfully seeded Chatbot Configuration.');
  }
};

module.exports = chatbotService;
