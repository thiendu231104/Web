/**
 * intentParser.js — Pass 1 AI Semantic Intent Extractor (Best-Fit Recommendation)
 *
 * GIAI ĐOẠN 1: Bóc tách ngữ nghĩa linh hoạt tại Pass 1 AI
 * Trích xuất ra đối tượng JSON với cấu trúc chuẩn:
 * - target_package: Mã gói cước nếu nhắc đích danh (như "ST30K", "SD90"). Null nếu không có.
 * - budget_exact: Số tiền chính xác user có (như "50k" -> 50000, "gói 0đ" -> 0). Null nếu không có.
 * - budget_max: Số tiền tối đa (như "dưới 100k" -> 100000, "gói miễn phí" -> 0). Null nếu không có.
 * - budget_min: Số tiền tối thiểu. Null nếu không có.
 * - duration_min: Số ngày tối thiểu (như "từ 3 ngày" -> 3). Null nếu không có.
 * - duration_max: Số ngày tối đa (như "đến 7 ngày" -> 7). Null nếu không có.
 * - apps: Mảng tên ứng dụng cụ thể (viết HOA). Nếu nhắc "mạng xã hội" kèm app cụ thể, chỉ lấy app cụ thể.
 * - app_match_type: MẶC ĐỊNH LUÔN LÀ "OR". Chỉ gán "AND" khi có từ nhấn mạnh "bắt buộc phải có cả", "yêu cầu có đủ cả".
 * - is_data_only: Boolean (true nếu hỏi gói thuần data).
 * - is_combo: Boolean (true nếu hỏi gói combo nghe gọi + data).
 */

const { generateContent } = require('../ai/ai.service');

const VALID_ALLOWED_APPS = ['FACEBOOK', 'TIKTOK', 'YOUTUBE', 'TV360', 'MESSENGER', 'INSTAGRAM'];

const INTENT_PARSER_SYSTEM_PROMPT = `Bạn là Chuyên gia bóc tách ngữ nghĩa nhu cầu viễn thông Viettel.
Nhiệm vụ của bạn là đọc câu nói của người dùng và trích xuất ra CHÍNH XÁC MỘT CHUỖI JSON (không kèm bất kỳ văn bản hay ký tự Markdown nào khác).

JSON Schema bắt buộc:
{
  "target_package": "Tên mã gói nếu có (vd: ST30K, SD90...). Đặt null nếu không nhắc tới",
  "budget_exact": Số tiền chính xác dạng số VNĐ (vd: "có 50k" -> 50000, "gói 100k" -> 100000, "gói 0đ" / "0 đồng" -> 0). Đặt null nếu dùng từ so sánh "dưới", "trên", "từ...đến",
  "budget_max": Số tiền tối đa dạng số VNĐ (vd: "dưới 100k" -> 100000, "gói miễn phí" / "0đ" -> 0). Đặt null nếu không có,
  "budget_min": Số tiền tối thiểu dạng số VNĐ (vd: "trên 50k" -> 50000). Đặt null nếu không có,
  "duration_min": Số ngày tối thiểu dạng số (vd: "từ 3 ngày" -> 3, "gói 7 ngày" -> 7). Đặt null nếu không có,
  "duration_max": Số ngày tối đa dạng số (vd: "đến 7 ngày" -> 7, "từ 3 đến 7 ngày" -> 7). Đặt null nếu không có,
  "apps": ["Mảng các tên ứng dụng cụ thể viết HOA CHỈ THUỘC DANH SÁCH: FACEBOOK, TIKTOK, YOUTUBE, TV360, MESSENGER, INSTAGRAM. TUYỆT ĐỐI KHÔNG đưa các từ như 'LƯỚT WEB', 'DATA', 'INTERNET', 'HOTSPOT' vào mảng này. Đặt [] nếu không nhắc ứng dụng cụ thể nào"],
  "app_match_type": "AND" hoặc "OR" (MẶC ĐỊNH LUÔN LÀ "OR" để tìm linh hoạt. CHỈ gán "AND" khi người dùng dùng các từ khóa nhấn mạnh tính bắt buộc đồng thời như: "bắt buộc phải có cả", "yêu cầu có đủ cả"),
  "is_data_only": true/false (true nếu người dùng hỏi gói thuần data/internet),
  "is_combo": true/false (CHỈ BẰNG true KHI VÀ CHỈ KHI người dùng TRỰC TIẾP NHẮC ĐẾN GỌI ĐIỆN / PHÚT GỌI như "gọi nội mạng", "gọi ngoại mạng", "phút gọi", "combo gọi data"),
  "is_general_or_greeting": true/false (true nếu người dùng chỉ chào hỏi, cảm ơn, tạm biệt, tán gẫu hoặc hỏi các câu hỏi chung chung/lạc đề không liên quan đến gói cước viễn thông Viettel)
}

QUY TẮC BẮT BUỘC PHÂN BIỆT DATA/NGÀY VỚI CHU KỲ GÓI CƯỚC (DURATION):
- Các cụm từ chỉ định mức Data theo ngày như "8GB/ngày", "2GB/ngày", "1.5GB/ngày", "mỗi ngày 2GB", "mỗi ngày 8GB", "tốc độ cao/ngày" CHỈ LÀ thông số ưu đãi Data, KHÔNG ĐƯỢC dùng để gán duration_min: 1 hoặc duration_max: 1.
- Cờ duration CHỈ ĐƯỢC XÁC ĐỊNH dựa vào chu kỳ tổng được nhắc tới trong câu:
  * Nếu có từ "tháng", "/tháng", "30 ngày" -> duration_min: 30, duration_max: 30.
  * Nếu có từ "năm", "12 tháng", "360 ngày" -> duration_min: 360, duration_max: 360.
  * Nếu có từ "gói ngày", "1 ngày", "trong ngày", "dùng 1 ngày" -> duration_min: 1, duration_max: 1.

QUY TẮC QUY ĐỔI MỐC THỜI GIAN "24H":
- Các cụm từ "24h", "đến 24h", "24 giờ", "trong ngày", "1 ngày", "theo ngày" BẮT BUỘC quy đổi thành duration_min: 1 và duration_max: 1 (Đơn vị tính là NGÀY, TUYỆT ĐỐI KHÔNG lấy số 24).
- CHỈ gán duration lớn hơn 1 khi người dùng nói rõ số NGÀY (VD: "3 ngày" -> duration: 3, "7 ngày" -> duration: 7, "30 ngày" -> duration: 30).

QUY TẮC PHÂN BIỆT IS_COMBO VÀ APPS:
- "is_combo": CHỈ gán true khi người dùng có nhu cầu GỌI ĐIỆN/PHÚT GỌI. Nếu người dùng chỉ cần Data + Tiện ích ứng dụng (như TV360, TikTok, YouTube, Facebook...): BẮT BUỘC đặt is_combo: false và đưa ứng dụng vào mảng apps (vd: apps: ["TV360"]).
- Mảng "apps" CHỈ ĐƯỢC CHỨA các ứng dụng cụ thể (FACEBOOK, TIKTOK, YOUTUBE, TV360, MESSENGER, INSTAGRAM).
- Các từ "lướt web", "data lướt web", "dung lượng", "hotspot", "truy cập mạng" KHÔNG PHẢI tên ứng dụng -> ĐẶT apps: [].
- Nếu người dùng hỏi các câu như "có gói 0đ không", "gói miễn phí", "0 đồng", "free cước"... -> BẮT BUỘC trích xuất budget_exact: 0 HOẶC budget_max: 0.

CẢNH BÁO: CHỈ TRẢ VỀ DUY NHẤT CHUỖI JSON CÓ ĐÚNG CÁC TRƯỜNG TRÊN.`;

const DEFAULT_INTENT = {
  target_package: null,
  budget_exact: null,
  budget_max: null,
  budget_min: null,
  duration_min: null,
  duration_max: null,
  apps: [],
  app_match_type: 'OR',
  is_data_only: false,
  is_combo: false,
  is_general_or_greeting: false
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
    console.error('[intentParser] Error parsing JSON from Pass 1 AI:', err.message);
    return null;
  }
}

/**
 * Hàm parse intent Pass 1 AI
 */
const parseIntent = async (userMessage, history = []) => {
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return { ...DEFAULT_INTENT, user_query: userMessage || '' };
  }

  try {
    let historyContext = '';
    if (history && history.length > 0) {
      historyContext = 'Lịch sử trò chuyện gần đây:\n' + history.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') + '\n\n';
    }

    const userPrompt = `${historyContext}Tin nhắn mới nhất của người dùng cần phân tích: "${userMessage.trim()}"`;

    const rawAiOutput = await generateContent(userPrompt, INTENT_PARSER_SYSTEM_PROMPT);
    const parsed = cleanAndParseJSON(rawAiOutput);

    if (!parsed || typeof parsed !== 'object') {
      console.warn('[intentParser] Fallback default intent due to invalid JSON return');
      return { ...DEFAULT_INTENT, user_query: userMessage };
    }

    const rawPkg = typeof parsed.target_package === 'string' ? parsed.target_package.trim() : null;
    const rawMatchType = typeof parsed.app_match_type === 'string' ? parsed.app_match_type.trim().toUpperCase() : 'OR';

    const sanitizedApps = Array.isArray(parsed.apps)
      ? parsed.apps
          .map(app => String(app).toUpperCase().trim())
          .filter(app => VALID_ALLOWED_APPS.includes(app))
      : [];

    // CHỈ CHO PHÉP is_combo = true KHI CÓ TỪ KHÓA GỌI / PHÚT GỌI THỰC SỰ
    const hasCallingKeyword = /gọi|goi|phút|phut|nói chuyện|noi chuyen|nghe gọi|nghe goi/i.test(userMessage);
    const finalIsCombo = Boolean(parsed.is_combo) && hasCallingKeyword;

    // QUY ĐỔI MỐC THỜI GIAN "24H" THÀNH 1 NGÀY VÀ PHÂN BIỆT VỚI DATA/NGÀY
    let durMin = typeof parsed.duration_min === 'number' && !isNaN(parsed.duration_min) ? parsed.duration_min : null;
    let durMax = typeof parsed.duration_max === 'number' && !isNaN(parsed.duration_max) ? parsed.duration_max : null;

    const isMonthlyQuery = /tháng|\/tháng|thang|30\s*ngày|30\s*ngay/i.test(userMessage);
    const isDailyDataRate = /\d+(?:\.\d+)?\s*gb\s*\/\s*ngày|\d+(?:\.\d+)?\s*gb\s*\/\s*ngay|mỗi\s*ngày\s*\d+|moi\s*ngay\s*\d+/i.test(userMessage);
    const isExplicitDayPackage = /gói\s*ngày|goi\s*ngay|1\s*ngày|1\s*ngay|đến\s*24h|trong\s*ngày/i.test(userMessage);

    if (isMonthlyQuery) {
      durMin = 30;
      durMax = 30;
    } else if (isDailyDataRate && !isExplicitDayPackage && (durMin === 1 || durMax === 1)) {
      durMin = null;
      durMax = null;
    }

    const is24hQuery = /24h|24\s*giờ|24\s*gio|đến\s*24h|trong\s*ngày|trong\s*ngay|1\s*ngày|1\s*ngay|theo\s*ngày/i.test(userMessage);
    if (!isMonthlyQuery && (is24hQuery || durMin === 24 || durMax === 24)) {
      durMin = 1;
      durMax = 1;
    }

    const hasGreetingKeyword = /^(hi|hello|helo|chào|chao|xin chào|xin chao|alo|ê|e|hello bạn|chào bạn|hi bạn|chào ad|ad ơi)$/i.test(userMessage.trim());
    let finalIsGeneralOrGreeting = Boolean(parsed.is_general_or_greeting) || hasGreetingKeyword;

    const parsedBudgetExact = typeof parsed.budget_exact === 'number' && !isNaN(parsed.budget_exact) ? parsed.budget_exact : null;
    const parsedBudgetMax = typeof parsed.budget_max === 'number' && !isNaN(parsed.budget_max) ? parsed.budget_max : null;
    const parsedBudgetMin = typeof parsed.budget_min === 'number' && !isNaN(parsed.budget_min) ? parsed.budget_min : null;

    if (
      (rawPkg && rawPkg.toLowerCase() !== 'null') ||
      parsedBudgetExact !== null ||
      parsedBudgetMax !== null ||
      parsedBudgetMin !== null ||
      durMin !== null ||
      durMax !== null ||
      sanitizedApps.length > 0 ||
      finalIsCombo
    ) {
      finalIsGeneralOrGreeting = false;
    }

    return {
      user_query: userMessage,
      target_package: (rawPkg && rawPkg.toLowerCase() !== 'null') ? rawPkg.toUpperCase() : null,
      budget_exact: parsedBudgetExact,
      budget_max: parsedBudgetMax,
      budget_min: parsedBudgetMin,
      duration_min: durMin,
      duration_max: durMax,
      apps: sanitizedApps,
      app_match_type: (rawMatchType === 'AND') ? 'AND' : 'OR',
      is_data_only: Boolean(parsed.is_data_only),
      is_combo: finalIsCombo,
      is_general_or_greeting: finalIsGeneralOrGreeting
    };

  } catch (error) {
    console.error('[intentParser] Pass 1 AI execution error:', error.message);
    return { ...DEFAULT_INTENT, user_query: userMessage };
  }
};

const intentParser = parseIntent;
intentParser.parse = parseIntent;
intentParser.parseIntent = parseIntent;

module.exports = intentParser;
