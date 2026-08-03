const http = require('http');
const { TextDecoder } = require('util');

/**
 * Gọi Ollama API bằng model cấu hình từ .env
 */
const generateResponse = (prompt, systemInstruction = null, timeoutMs = 30000) => {
  return new Promise((resolve, reject) => {
    let actualSystemInstruction = systemInstruction;
    let actualTimeout = timeoutMs;
    if (typeof systemInstruction === 'number') {
      actualTimeout = systemInstruction;
      actualSystemInstruction = null;
    }

    const model = process.env.OLLAMA_MODEL || "qwen2.5:3b";
    const hostRaw = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

    let hostname = '127.0.0.1';
    let port = 11434;
    try {
      const url = new URL(hostRaw);
      hostname = url.hostname;
      port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
    } catch (e) {
      // Fallback hostname/port
    }

    const postPayload = {
      model,
      prompt,
      stream: false
    };
    if (actualSystemInstruction) {
      postPayload.system = actualSystemInstruction;
    }

    const postData = JSON.stringify(postPayload);

    const options = {
      hostname,
      port,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept-Charset': 'utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      const decoder = new TextDecoder('utf-8');
      let data = '';

      res.on('data', (chunk) => {
        data += decoder.decode(chunk, { stream: true });
      });

      res.on('end', () => {
        try {
          data += decoder.decode();
          if (res.statusCode !== 200) {
            return reject(new Error(`Ollama API returned HTTP status ${res.statusCode}`));
          }
          const responseJson = JSON.parse(data);
          const responseText = responseJson.response;
          if (responseText === undefined || responseText === null) {
            return reject(new Error('Empty response from Ollama API'));
          }
          resolve(responseText.trim());
        } catch (error) {
          reject(error);
        }
      });
    });

    req.setTimeout(actualTimeout, () => {
      req.destroy();
      reject(new Error(`Ollama API request timed out after ${actualTimeout}ms`));
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

module.exports = { generateResponse };
