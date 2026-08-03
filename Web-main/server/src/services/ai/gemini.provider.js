const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gọi Google Gemini API bằng model gemini-1.5-flash
 */
const generateResponse = async (prompt, systemInstruction = null, timeoutMs = 10000) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelOptions = { model: 'gemini-1.5-flash' };
  if (systemInstruction) {
    modelOptions.systemInstruction = systemInstruction;
  }

  const model = genAI.getGenerativeModel(modelOptions);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini API timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const generatePromise = (async () => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text ? text.trim() : '';
  })();

  return Promise.race([generatePromise, timeoutPromise]);
};

module.exports = { generateResponse };
