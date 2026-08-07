/**
 * intentParser.js — Pass 1 LLM Natural Language Understanding (NLU) & Structured Requirements Extractor
 *
 * Chức năng:
 * - Phân tích ngữ nghĩa câu nói tự nhiên của người dùng (kèm lịch sử hội thoại).
 * - Trích xuất Nhu cầu có Cấu trúc (Structured Requirements) dạng JSON.
 * - Chuẩn hóa data_type & cycle_preference tự động cho mọi câu thoại tự nhiên.
 */

const { generateContent } = require('../ai/ai.service');

const VALID_ALLOWED_APPS = ['FACEBOOK', 'TIKTOK', 'YOUTUBE', 'TV360', 'MESSENGER', 'INSTAGRAM'];

const INTENT_PARSER_SYSTEM_PROMPT = `Bạn là Chuyên gia thấu hiểu và phân tích ngữ nghĩa nhu cầu viễn thông Viettel.
Nhiệm vụ của bạn là đọc câu nói tự nhiên của người dùng (kèm lịch sử trò chuyện nếu có) và trích xuất cấu trúc dữ liệu nhu cầu (Structured Requirements) dưới dạng DUY NHẤT 1 chuỗi JSON (không chứa bất kỳ markdown hay văn bản nào khác).

JSON Schema bắt buộc:
{
  "target_package": "Tên mã gói cước nếu người dùng nhắc đích danh (ví dụ: SD90, ST30K, V120B, MXH100...). Đặt null nếu không nhắc mã gói nào",
  "budget_exact": Số tiền chính xác dạng số VNĐ nếu người dùng đưa mốc cố định (vd: "50k" -> 50000, "0đ" / "miễn phí" -> 0). Đặt null nếu không có số chính xác,
  "budget_max": Số tiền tối đa dạng số VNĐ (vd: "dưới 100k" -> 100000, "tầm 150k trở xuống" -> 150000). Đặt null nếu không có,
  "budget_min": Số tiền tối thiểu dạng số VNĐ (vd: "trên 50k" -> 50000). Đặt null nếu không có,
  "price_preference": "cheapest" (nếu thể hiện mong muốn rẻ nhất/tiết kiệm nhất) | "best_value" (nếu hỏi gói hời/đáng tiền nhất) | null,
  "data_type": "general" (nếu khách cần data lướt web, học tập, truy cập mạng chung/tổng hợp/dùng chung) | "app_specific" (nếu khách chỉ cần data cho 1 ứng dụng cụ thể như xem TikTok, chơi game, xem phim, TV360) | "any" (nếu không chỉ rõ),
  "duration_days": Số ngày sử dụng dự kiến dạng số (vd: "1 ngày" / "24h" / "trong ngày" -> 1, "3 ngày" -> 3, "2 tuần" -> 14, "1 tháng" -> 30, "3 tháng" -> 90, "1 năm" -> 360). Đặt null nếu người dùng chỉ nói chung chung như "chu kỳ dài", "dùng lâu dài" hoặc không nói rõ số ngày cụ thể,
  "cycle_preference": "short" (dùng ngắn hạn: theo ngày/tuần, <= 15 ngày) | "monthly" (theo tháng, ~30 ngày) | "long_term" (lâu dài/dài hạn/chu kỳ dài: nhiều tháng/năm, >= 90 ngày) | null,
  "apps": ["Mảng các ứng dụng cụ thể viết HOA thuộc danh sách: FACEBOOK, TIKTOK, YOUTUBE, TV360, MESSENGER, INSTAGRAM. Đặt [] nếu không nhắc ứng dụng nào"],
  "app_match_type": "OR" (mặc định) hoặc "AND" (chỉ khi có từ bắt buộc có đủ cả),
  "data_volume_preference": "high" (nếu dùng nhiều mạng/xem video nhiều: "mạng nhiều", "data khủng", "xem TikTok nhiều", "dung lượng cao", "thoải mái") | "medium" | "low" | null,
  "is_data_only": true/false (true nếu người dùng chỉ cần data/mạng/lướt web, không cần phút gọi điện),
  "is_combo": true/false (true nếu người dùng nhắc tới hoặc có nhu cầu gọi điện, phút gọi, gọi nội/ngoại mạng, combo),
  "is_general_or_greeting": true/false (true nếu người dùng chỉ chào hỏi, cảm ơn, tạm biệt, tán gẫu hoặc hỏi các vấn đề không liên quan đến gói cước viễn thông Viettel),
  "user_intent_summary": "Tóm tắt ngắn gọn 1 câu về nhu cầu thực sự của khách hàng"
}

QUY TẮC PHÂN TÍCH NGÔN NGỮ TỰ NHIÊN (NLU):
1. Quy tắc Chu kỳ dài & Dùng lâu dài:
   - Khi khách nói "chu kỳ dài", "dùng lâu dài", "dài hạn" mà KHÔNG có số ngày cụ thể: BẮT BUỘC ĐẶT "cycle_preference": "long_term" và "duration_days": null (TUYỆT ĐỐI KHÔNG ép cứng duration_days = 30).
2. Quy tắc Phân loại Data Type:
   - "general": Khách cần data lướt web, học tập, truy cập mạng chung (vd: "truy cập mạng", "lướt web", "data dùng chung", "dùng mạng").
   - "app_specific": Khách chỉ cần data cho 1 ứng dụng cụ thể (vd: "chơi game", "xem phim", "tiktok", "youtube").
   - "any": Không chỉ rõ.
3. Thấu hiểu ý định gián tiếp & tự nhiên:
   - "Tôi cần mạng nhiều để xem TikTok, dùng khoảng 2 tuần" -> apps: ["TIKTOK"], data_type: "app_specific", data_volume_preference: "high", duration_days: 14, cycle_preference: "short", is_data_only: true
   - "Có gói nào rẻ mà đủ dùng cho người hay xem YouTube không?" -> apps: ["YOUTUBE"], data_type: "app_specific", price_preference: "cheapest", is_data_only: true
   - "Tôi cần gói lâu dài, càng tiết kiệm càng tốt" -> cycle_preference: "long_term", duration_days: null, price_preference: "cheapest", data_type: "general"
   - "Tôi chỉ cần data lướt web, không quan tâm gọi thoại" -> data_type: "general", is_data_only: true, is_combo: false

CẢNH BÁO: CHỈ TRẢ VỀ DUY NHẤT 1 CHUỖI JSON HỢP LỆ. KHÔNG BAO GỒM VĂN BẢN KHÁC.`;

const DEFAULT_INTENT = {
  target_package: null,
  budget_exact: null,
  budget_max: null,
  budget_min: null,
  price_preference: null,
  data_type: 'any',
  duration_days: null,
  cycle_preference: null,
  apps: [],
  app_match_type: 'OR',
  data_volume_preference: null,
  is_data_only: false,
  is_combo: false,
  is_general_or_greeting: false,
  user_intent_summary: ''
};

/**
 * Clean & Parse JSON safely
 */
function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[intentParser] Error parsing JSON from NLU Pass 1 AI:', err.message);
    return null;
  }
}

/**
 * Main NLU Intent Extraction function
 */
const parseIntent = async (userMessage, history = []) => {
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return { ...DEFAULT_INTENT, user_query: userMessage || '' };
  }

  try {
    let historyContext = '';
    if (history && history.length > 0) {
      historyContext = 'Lịch sử trò chuyện gần đây:\n' + 
        history.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') + 
        '\n\n';
    }

    const userPrompt = `${historyContext}Tin nhắn mới nhất của người dùng cần phân tích NLU: "${userMessage.trim()}"`;

    const rawAiOutput = await generateContent(userPrompt, INTENT_PARSER_SYSTEM_PROMPT);
    const parsed = cleanAndParseJSON(rawAiOutput);

    if (!parsed || typeof parsed !== 'object') {
      console.warn('[intentParser] Fallback default intent due to invalid JSON return from NLU');
      return { ...DEFAULT_INTENT, user_query: userMessage };
    }

    const rawPkg = typeof parsed.target_package === 'string' ? parsed.target_package.trim() : null;
    const rawMatchType = typeof parsed.app_match_type === 'string' ? parsed.app_match_type.trim().toUpperCase() : 'OR';

    const sanitizedApps = Array.isArray(parsed.apps)
      ? parsed.apps
          .map(app => String(app).toUpperCase().trim())
          .filter(app => VALID_ALLOWED_APPS.includes(app))
      : [];

    const targetPkgClean = (rawPkg && rawPkg.toLowerCase() !== 'null' && rawPkg !== '') ? rawPkg.toUpperCase() : null;

    // Safety type coercion for numbers
    const numOrNull = (val) => (typeof val === 'number' && !isNaN(val)) ? val : null;

    const dataTypeClean = ['general', 'app_specific', 'any'].includes(parsed.data_type) ? parsed.data_type : 'any';

    // Đảm bảo khi "cycle_preference" là "long_term" mà không có số ngày cụ thể thì duration_days = null
    let finalDurationDays = numOrNull(parsed.duration_days);
    const finalCyclePreference = ['short', 'monthly', 'long_term'].includes(parsed.cycle_preference) ? parsed.cycle_preference : null;
    if (finalCyclePreference === 'long_term' && parsed.duration_days == null) {
      finalDurationDays = null;
    }

    return {
      user_query: userMessage,
      target_package: targetPkgClean,
      budget_exact: numOrNull(parsed.budget_exact),
      budget_max: numOrNull(parsed.budget_max),
      budget_min: numOrNull(parsed.budget_min),
      price_preference: ['cheapest', 'best_value'].includes(parsed.price_preference) ? parsed.price_preference : null,
      data_type: dataTypeClean,
      duration_days: finalDurationDays,
      cycle_preference: finalCyclePreference,
      apps: sanitizedApps,
      app_match_type: (rawMatchType === 'AND') ? 'AND' : 'OR',
      data_volume_preference: ['high', 'medium', 'low'].includes(parsed.data_volume_preference) ? parsed.data_volume_preference : null,
      is_data_only: Boolean(parsed.is_data_only),
      is_combo: Boolean(parsed.is_combo),
      is_general_or_greeting: Boolean(parsed.is_general_or_greeting),
      user_intent_summary: typeof parsed.user_intent_summary === 'string' ? parsed.user_intent_summary : ''
    };

  } catch (error) {
    console.error('[intentParser] Pass 1 NLU execution error:', error.message);
    return { ...DEFAULT_INTENT, user_query: userMessage };
  }
};

const intentParser = parseIntent;
intentParser.parse = parseIntent;
intentParser.parseIntent = parseIntent;

module.exports = intentParser;
