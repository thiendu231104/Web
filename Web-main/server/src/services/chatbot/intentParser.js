/**
 * intentParser.js — Pass 1 LLM Natural Language Understanding (NLU) & Structured Requirements Extractor
 *
 * Chức năng:
 * - Phân tích ngữ nghĩa câu nói tự nhiên của người dùng (kèm lịch sử hội thoại).
 * - Trích xuất Nhu cầu có Cấu trúc (Structured Requirements) dạng JSON.
 * - Chuẩn hóa budget_max, duration_days, is_combo, target_package và reset user_intent_summary.
 */

const { generateContent } = require('../ai/ai.service');

const VALID_ALLOWED_APPS = ['FACEBOOK', 'TIKTOK', 'YOUTUBE', 'TV360', 'MESSENGER', 'INSTAGRAM', 'GARENA'];

const INTENT_PARSER_SYSTEM_PROMPT = `Bạn là Chuyên gia thấu hiểu và phân tích ngữ nghĩa nhu cầu viễn thông Viettel.
Nhiệm vụ của bạn là đọc câu nói tự nhiên của người dùng (kèm lịch sử trò chuyện nếu có) và trích xuất cấu trúc dữ liệu nhu cầu (Structured Requirements) dưới dạng DUY NHẤT 1 chuỗi JSON (không chứa bất kỳ markdown hay văn bản nào khác).

JSON Schema bắt buộc:
{
  "target_package": "Tên mã gói cước nếu người dùng nhắc đích danh (ví dụ: SD90, ST30K, V120B, MXH100, 12SD90...). Đặt null nếu không nhắc mã gói nào",
  "budget_exact": Số tiền chính xác dạng số VNĐ nếu người dùng đưa mốc cố định (vd: "50k" -> 50000, "0đ" / "miễn phí" -> 0). Đặt null nếu không có số chính xác,
  "budget_max": Số tiền tối đa dạng số VNĐ. LƯU Ý BẮT BUỘC: Khi người dùng nói "tôi có 5k", "tài khoản còn 50k", "có khoảng 70k", "tầm 50k" -> BẮT BUỘC gán budget_max = [số_tiền_chính_xác] (vd: 5k -> 5000, 50k -> 50000, 70k -> 70000). Đặt null nếu không có mốc tối đa,
  "budget_min": Số tiền tối thiểu dạng số VNĐ (vd: "trên 50k" -> 50000). Đặt null nếu không có,
  "price_preference": "cheapest" (nếu thể hiện mong muốn rẻ nhất/tiết kiệm nhất) | "best_value" (nếu hỏi gói hời/đáng tiền nhất) | null,
  "data_type": "general" (nếu khách cần data lướt web, học tập, tải tài liệu, truy cập mạng chung/tổng hợp/dùng chung HOẶC yêu cầu từ 2 ứng dụng trở lên) | "app_specific" (nếu khách CHỈ cần data cho 1 ứng dụng cụ thể như xem TikTok, chơi game, xem phim, TV360) | "any" (nếu không chỉ rõ),
  "duration_days": Số ngày sử dụng dự kiến dạng số (vd: "1 ngày" / "24h" / "trong ngày" -> 1, "3 ngày" -> 3, "2 tuần" -> 14, "1 tháng" / "30 ngày" -> 30, "3 tháng" -> 90, "6 tháng" / "nửa năm" -> 180, "1 năm" / "12 tháng" -> 360). Đặt null nếu không nói rõ số ngày cụ thể,
  "cycle_preference": "short" (dùng ngắn hạn: theo ngày/tuần, <= 15 ngày) | "monthly" (theo tháng, ~30 ngày) | "long_term" (lâu dài/dài hạn/chu kỳ dài: nhiều tháng/năm, >= 90 ngày) | null,
  "apps": ["Mảng các ứng dụng cụ thể viết HOA thuộc danh sách: FACEBOOK, TIKTOK, YOUTUBE, TV360, MESSENGER, INSTAGRAM, GARENA. Đặt [] nếu không nhắc ứng dụng nào"],
  "app_match_type": "OR" (mặc định) hoặc "AND" (chỉ khi có từ bắt buộc có đủ cả),
  "data_volume_preference": "high" (nếu dùng nhiều mạng/xem video nhiều) | "medium" | "low" | null,
  "is_data_only": true/false (true nếu người dùng chỉ cần data/mạng/lướt web, không cần phút gọi điện),
  "is_combo": true/false (chỉ = true khi người dùng CÓ nhắc đến "gọi điện", "phút gọi", "nghe gọi", "combo", "nội mạng", "ngoại mạng"),
  "is_general_or_greeting": true/false (true nếu người dùng chỉ chào hỏi, cảm ơn, tán gẫu không liên quan đến gói cước),
  "user_intent_summary": "Tóm tắt ngắn gọn 1 câu về nhu cầu thực sự của khách hàng"
}

QUY TẮC PHÂN TÍCH NGÔN NGỮ TỰ NHIÊN (NLU):
1. Quy tắc is_combo: Chỉ = true khi câu hỏi CÓ nhắc đến "gọi điện", "phút gọi", "nghe gọi", "combo", "nội mạng", "ngoại mạng". Nếu đã is_combo = true thì is_data_only PHẢI = false.
2. Quy tắc duration_days: Bắt từ khóa thời gian cực chuẩn:
   - "1 tháng" / "30 ngày" / "cả tháng" / "tháng" -> duration_days: 30, cycle_preference: "monthly"
   - "6 tháng" / "nửa năm" / "180 ngày" -> duration_days: 180, cycle_preference: "long_term"
   - "1 năm" / "12 tháng" / "cả năm" / "360 ngày" -> duration_days: 360, cycle_preference: "long_term"
   - "trong ngày" / "hôm nay" / "24h" / "1 ngày" -> duration_days: 1, cycle_preference: "short"
3. Quy tắc Ngân sách: "50k" -> budget_max: 50000; "5k" -> budget_max: 5000; "70k" -> budget_max: 70000.
4. Quy tắc Game GARENA: "Liên Quân", "Free Fire", "chơi game", "garena" -> apps: ["GARENA"].
5. QUY TẮC RESET SUMMARY KHI NHẮC ĐÍCH DANH MÃ GÓI (TARGET PACKAGE RESET):
   - Khi target_package KHÁC NULL (người dùng gõ đích danh tên gói cước như "12SD90", "V120N", "SD90"...):
   - BẮT BUỘC gán user_intent_summary: "Tư vấn chi tiết gói cước [target_package]".
   - TUYỆT ĐỐI CẤM lấy lại summary hoặc budget_max của các câu hỏi cũ trong lịch sử chat.

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
    const parsed = cleanAndParseJSON(rawAiOutput) || {};

    const rawPkg = typeof parsed.target_package === 'string' ? parsed.target_package.trim() : null;
    const rawMatchType = typeof parsed.app_match_type === 'string' ? parsed.app_match_type.trim().toUpperCase() : 'OR';

    let sanitizedApps = Array.isArray(parsed.apps)
      ? parsed.apps
          .map(app => String(app).toUpperCase().trim())
          .filter(app => VALID_ALLOWED_APPS.includes(app))
      : [];

    const hasGameKeywords = /liên\s*quân|free\s*fire|chơi\s*game|garena/i.test(userMessage);
    if (hasGameKeywords && !sanitizedApps.includes('GARENA')) {
      sanitizedApps.push('GARENA');
    }

    const targetPkgClean = (rawPkg && rawPkg.toLowerCase() !== 'null' && rawPkg !== '') ? rawPkg.toUpperCase() : null;
    const numOrNull = (val) => (typeof val === 'number' && !isNaN(val)) ? val : null;

    let budgetMaxClean = numOrNull(parsed.budget_max);
    let budgetExactClean = numOrNull(parsed.budget_exact);

    const budgetMatch = userMessage.match(/(?:tôi\s+có|tài\s+khoản\s+còn|có\s+khoảng|chỉ\s+có|tầm|khoảng|mình\s+có)\s*(\d+(?:\.\d+)?)\s*(k|đ|vnd|nghìn|ngàn)?\b/i);
    if (budgetMatch && budgetMaxClean == null && budgetExactClean == null) {
      const numStr = budgetMatch[1].replace(/\./g, '');
      const rawNum = parseFloat(numStr);
      const unit = (budgetMatch[2] || '').toLowerCase();
      if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn' || (unit === '' && rawNum <= 500)) {
        budgetMaxClean = Math.round(rawNum * 1000);
      } else {
        budgetMaxClean = Math.round(rawNum);
      }
    }

    // Explicit Rule 1: is_combo & is_data_only
    const hasComboKeywords = /gọi\s*điện|phút\s*gọi|nghe\s*gọi|combo|nội\s*mạng|ngoại\s*mạng/i.test(userMessage);
    const isComboClean = Boolean(parsed.is_combo) || hasComboKeywords;
    const hasGeneralDataKeywords = /data\s*thuần|tải\s*tài\s*liệu|lướt\s*web|truy\s*cập\s*mạng|vừa.*vừa|nhiều\s*ứng\s*dụng/i.test(userMessage);
    const isDataOnlyClean = isComboClean ? false : (Boolean(parsed.is_data_only) || hasGeneralDataKeywords);

    // Explicit Rule 2: duration_days & cycle_preference
    let durationDaysClean = numOrNull(parsed.duration_days);
    let cyclePreferenceClean = ['short', 'monthly', 'long_term'].includes(parsed.cycle_preference) ? parsed.cycle_preference : null;

    if (/1\s*tháng|30\s*ngày|cả\s*tháng|mỗi\s*tháng/i.test(userMessage)) {
      durationDaysClean = 30;
      cyclePreferenceClean = 'monthly';
    } else if (/6\s*tháng|nửa\s*năm|180\s*ngày/i.test(userMessage)) {
      durationDaysClean = 180;
      cyclePreferenceClean = 'long_term';
    } else if (/1\s*năm|12\s*tháng|cả\s*năm|360\s*ngày/i.test(userMessage)) {
      durationDaysClean = 360;
      cyclePreferenceClean = 'long_term';
    } else if (/3\s*tháng|90\s*ngày/i.test(userMessage)) {
      durationDaysClean = 90;
      cyclePreferenceClean = 'long_term';
    } else if (/hôm\s*nay|24h|trong\s*ngày|1\s*ngày/i.test(userMessage)) {
      durationDaysClean = 1;
      cyclePreferenceClean = 'short';
    }

    let dataTypeClean = ['general', 'app_specific', 'any'].includes(parsed.data_type) ? parsed.data_type : 'any';
    if (sanitizedApps.length >= 2 || hasGeneralDataKeywords) {
      dataTypeClean = 'general';
    } else if (hasGameKeywords && sanitizedApps.length === 1) {
      dataTypeClean = 'app_specific';
    }

    let userIntentSummaryClean = typeof parsed.user_intent_summary === 'string' ? parsed.user_intent_summary : '';

    // TARGET PACKAGE RESET RULE: Reset summary & budget when target_package is specified
    if (targetPkgClean) {
      userIntentSummaryClean = `Tư vấn chi tiết gói cước ${targetPkgClean}`;
      if (!budgetMatch) {
        budgetMaxClean = null;
        budgetExactClean = null;
      }
    }

    return {
      user_query: userMessage,
      target_package: targetPkgClean,
      budget_exact: budgetExactClean,
      budget_max: budgetMaxClean,
      budget_min: numOrNull(parsed.budget_min),
      price_preference: ['cheapest', 'best_value'].includes(parsed.price_preference) ? parsed.price_preference : null,
      data_type: dataTypeClean,
      duration_days: durationDaysClean,
      cycle_preference: cyclePreferenceClean,
      apps: sanitizedApps,
      app_match_type: (rawMatchType === 'AND') ? 'AND' : 'OR',
      data_volume_preference: ['high', 'medium', 'low'].includes(parsed.data_volume_preference) ? parsed.data_volume_preference : null,
      is_data_only: isDataOnlyClean,
      is_combo: isComboClean,
      is_general_or_greeting: Boolean(parsed.is_general_or_greeting),
      user_intent_summary: userIntentSummaryClean
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
