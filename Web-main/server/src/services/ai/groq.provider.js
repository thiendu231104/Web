const https = require('https');
const { TextDecoder } = require('util');

/**
 * Gọi Groq API với cơ chế Retry 1 lần (tạm dừng 2s) khi đụng Rate Limit 429
 */
const makeGroqRequest = (prompt, systemInstruction = null, timeoutMs = 15000, overrideModel = null) => {
  return new Promise((resolve, reject) => {
    let actualSystemInstruction = systemInstruction;
    let actualTimeout = timeoutMs;
    if (typeof systemInstruction === 'number') {
      actualTimeout = systemInstruction;
      actualSystemInstruction = null;
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = overrideModel || process.env.GROQ_MODEL || "llama-3.1-8b-instant";

    if (!apiKey) {
      return reject(new Error("Missing GROQ_API_KEY in environment variables"));
    }

    const messages = [];
    if (actualSystemInstruction) {
      messages.push({
        role: "system",
        content: actualSystemInstruction
      });
    }
    messages.push({
      role: "user",
      content: prompt
    });

    const postData = JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.2
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept-Charset': 'utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      const decoder = new TextDecoder('utf-8');
      let data = '';

      res.on('data', (chunk) => {
        data += decoder.decode(chunk, { stream: true });
      });

      res.on('end', () => {
        try {
          data += decoder.decode();
          if (res.statusCode === 429) {
            const err = new Error(`Groq API returned HTTP status 429 Rate Limit`);
            err.statusCode = 429;
            return reject(err);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Groq API returned HTTP status ${res.statusCode}: ${data}`));
          }
          const responseJson = JSON.parse(data);
          const responseText = responseJson.choices?.[0]?.message?.content;
          if (responseText === undefined || responseText === null) {
            return reject(new Error('Empty response from Groq API'));
          }
          resolve(responseText.trim());
        } catch (error) {
          reject(error);
        }
      });
    });

    req.setTimeout(actualTimeout, () => {
      req.destroy();
      reject(new Error(`Groq API request timed out after ${actualTimeout}ms`));
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

const generateResponse = async (prompt, systemInstruction = null, timeoutMs = 15000) => {
  try {
    return await makeGroqRequest(prompt, systemInstruction, timeoutMs);
  } catch (error) {
    if (error.statusCode === 429 || (error.message && error.message.includes('429'))) {
      console.warn('[Groq Provider] Rate limit 429 hit. Pausing 1s and Retrying with Mixtral-8x7b-32768...');
      await new Promise(r => setTimeout(r, 1000));
      try {
        return await makeGroqRequest(prompt, systemInstruction, timeoutMs, 'mixtral-8x7b-32768');
      } catch (retryError) {
        if (retryError.statusCode === 429 || (retryError.message && retryError.message.includes('429'))) {
          console.warn('[Groq Provider] Rate limit 429 hit on Mixtral. Retrying with llama-3.3-70b-specdec...');
          return await makeGroqRequest(prompt, systemInstruction, timeoutMs, 'llama-3.3-70b-specdec');
        }
        throw retryError;
      }
    }
    throw error;
  }
};

module.exports = { generateResponse };
