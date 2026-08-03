const groqProvider = require('./groq.provider');
const geminiProvider = require('./gemini.provider');
const ollamaProvider = require('./ollama.provider');

/**
 * AI Service trung gian quản lý Retry & Failover giữa các LLM Providers:
 * 1. Groq Provider (có Retry 1 lần khi bị HTTP 429).
 * 2. Failover sang Google Gemini API (gemini-1.5-flash sử dụng GEMINI_API_KEY).
 * 3. Failover cuối cùng sang Ollama với timeout tối đa 5000ms (5s).
 */
const generateContent = async (prompt, systemInstruction = null) => {
  console.time("[Chatbot AI] Generate");

  // 1. Thử gọi Groq Provider (Có Retry 1 lần trong groq.provider.js khi lỗi 429)
  try {
    console.log('[AI Service] Step 1: Trying Groq Provider...');
    const response = await groqProvider.generateResponse(prompt, systemInstruction, 15000);
    console.timeEnd("[Chatbot AI] Generate");
    return response;
  } catch (groqError) {
    console.error('[AI Service] Groq Provider failed after retry:', groqError.message);
  }

  // 2. Failover sang Google Gemini API (gemini-1.5-flash)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('[AI Service] Step 2: Failover to Google Gemini (gemini-1.5-flash)...');
      const response = await geminiProvider.generateResponse(prompt, systemInstruction, 10000);
      console.timeEnd("[Chatbot AI] Generate");
      return response;
    } catch (geminiError) {
      console.error('[AI Service] Google Gemini Failover failed:', geminiError.message);
    }
  } else {
    console.log('[AI Service] GEMINI_API_KEY not configured in environment variables.');
  }

  // 3. Failover cuối sang Ollama với timeout tối đa 5000ms (5 giây)
  try {
    console.log('[AI Service] Step 3: Final Failover to Ollama (timeout: 5000ms)...');
    const response = await ollamaProvider.generateResponse(prompt, systemInstruction, 5000);
    console.timeEnd("[Chatbot AI] Generate");
    return response;
  } catch (ollamaError) {
    console.timeEnd("[Chatbot AI] Generate");
    console.error('[AI Service] Final Ollama Failover failed:', ollamaError.message);
    throw new Error('Tất cả các AI Provider (Groq, Gemini, Ollama) đều gặp sự cố kết nối.');
  }
};

module.exports = { generateContent };
