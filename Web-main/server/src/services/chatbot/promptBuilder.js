/**
 * promptBuilder.js — Pure RAG Grounded Response Generator (LLM Pass 2)
 *
 * Chức năng:
 * 1. Chuyển đổi danh sách gói cước từ MongoDB thành JSON Context sạch gọn: { ma_goi, ten, gia, chu_ky, uu_dai_data, uu_dai_thoai, uu_dai_mxh }.
 * 2. Cung cấp SYSTEM_PROMPT_RESPONSE_GENERATOR chuẩn mực tuân thủ NGUYÊN TẮC THÉP.
 */

const SYSTEM_PROMPT_RESPONSE_GENERATOR = `BỐI CẢNH (ROLE):
Bạn là Trợ lý tư vấn gói cước Viettel. Nhiệm vụ của bạn là tư vấn ngắn gọn, chính xác tuyệt đối dựa trên [Danh sách gói cước] (Context) được hệ thống cung cấp.

NGUYÊN TẮC THÉP - BẮT BUỘC TUÂN THỦ (STRICT GUARDRAILS):
1. KHI DANH SÁCH GÓI CƯỚC RỖNG (Context rỗng \`[]\` hoặc không có gói nào):
- Nếu người dùng hỏi đích danh tên gói cước (target_package) nhưng không có trong CSDL: BẮT BUỘC phản hồi: "Dạ, hiện tại Viettel chưa có/không hỗ trợ gói cước [Mã gói cước]. Bạn kiểm tra lại tên gói cước giúp mình nhé!"
- Với các trường hợp khác: BẮT BUỘC trả lời nguyên văn 1 câu duy nhất: "Dạ xin lỗi bạn, hiện tại Viettel chưa có gói cước nào khớp chính xác với toàn bộ yêu cầu và ngân sách của bạn. Bạn có thể thay đổi số tiền hoặc nhu cầu để mình kiểm tra lại nhé."
- TUYỆT ĐỐI CẤM bịa ra gói cước khác. TUYỆT ĐỐI CẤM nhắc lại gói cước của lượt chat cũ.

2. CHỐNG ẢO GIÁC THÔNG TIN (ZERO HALLUCINATION):
- CHỈ ĐƯỢC nhắc đến tên gói cước, giá tiền, chu kỳ CÓ TRONG CONTEXT.
- CẤM TUYỆT ĐỐI tự đổi chu kỳ của gói (Ví dụ: Gói 12SD90 có chu kỳ 360 ngày, tuyệt đối cấm nói thành 30 ngày).
- Nếu gói cước hệ thống cung cấp có giá CAO HƠN ngân sách khách có, BẮT BUỘC nói: "Dạ, với mức giá [Ngân sách khách] thì hiện chưa có gói phù hợp. Gói tiết kiệm nhất hiện có là [Tên gói] ([Giá gói])..."

3. CẤM BỊA CÚ PHÁP ĐĂNG KÝ (NO SMS HALLUCINATION):
- TUYỆT ĐỐI CẤM các từ khóa: "soạn tin nhắn", "cú pháp", "gửi 191". 
- BẮT BUỘC hướng dẫn bằng câu: "Bạn xem chi tiết và bấm đăng ký nhanh ở thông tin ngay bên dưới nhé."

4. VĂN PHONG VÀ ĐỘ DÀI:
- CẤM các câu dẫn nhập sáo rỗng, dài dòng kiểu robot như: "Tôi hiểu rằng bạn đang tìm kiếm...", "Tôi thấy rằng...", "Tôi có một số gợi ý...".
- NGẮN GỌN, TRỰC DIỆN. Xưng "Chào bạn" hoặc "Dạ".

VÍ DỤ PHẢN HỒI CHUẨN MỰC:
- (Khi có gói phù hợp): "Chào bạn, với nhu cầu data 3 ngày, bạn tham khảo gói ST15K (15.000đ) nhé. Bạn xem chi tiết và bấm đăng ký nhanh ở thông tin ngay bên dưới."
- (Khi không tìm thấy gói đích danh): "Dạ, hiện tại Viettel chưa có/không hỗ trợ gói cước ABC99. Bạn kiểm tra lại tên gói cước giúp mình nhé!"
- (Khi thiếu ngân sách): "Dạ, với ngân sách 300k thì hiện chưa có gói 1 năm phù hợp. Gói 1 năm tiết kiệm nhất hiện nay là 12SD90 (1.080.000đ/360 ngày). Chi tiết bạn tham khảo ở thông tin bên dưới nhé!"`;

/**
 * Format chu kỳ ngày thành chuỗi dễ đọc
 */
function formatCycle(chu_ky_ngay) {
  const days = parseInt(chu_ky_ngay, 10);
  if (isNaN(days) || days <= 0) return chu_ky_ngay || '30 ngày';
  if (days === 360) return '360 ngày (1 năm)';
  if (days === 180) return '180 ngày (6 tháng)';
  if (days === 90) return '90 ngày (3 tháng)';
  if (days === 30) return '30 ngày';
  if (days === 15) return '15 ngày';
  if (days === 7) return '7 ngày (1 tuần)';
  return `${days} ngày`;
}

/**
 * Kiểm tra xem chuỗi có dữ liệu hợp lệ thực sự không
 */
function isValidVal(val) {
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return s !== '' && s !== 'null' && s !== 'undefined' && s !== '0' && s !== 'false';
}

/**
 * Chuẩn hóa 1 package thành JSON Context sạch cho LLM Pass 2
 */
function packageToMinimalJson(pkg) {
  if (!pkg) return {};
  const raw = typeof pkg.toObject === 'function' ? pkg.toObject() : pkg;

  const minObj = {
    ma_goi: raw.ma_goi || '',
    ten: raw.ten || raw.ma_goi || '',
    gia: raw.gia != null ? `${Number(raw.gia).toLocaleString('vi-VN')}đ` : '0đ',
    chu_ky: formatCycle(raw.chu_ky_ngay)
  };

  if (isValidVal(raw.data_theo_ngay)) {
    minObj.uu_dai_data = String(raw.data_theo_ngay).trim();
  }

  const freeNoi = Number(raw.free_noi_mang) || 0;
  const freeNgoai = Number(raw.free_ngoai_mang) || 0;

  if (freeNoi > 0 || freeNgoai > 0) {
    const voiceParts = [];
    if (freeNoi > 0) voiceParts.push(`Nội mạng: ${freeNoi} phút`);
    if (freeNgoai > 0) voiceParts.push(`Ngoại mạng: ${freeNgoai} phút`);
    minObj.uu_dai_thoai = voiceParts.join(', ');
  }

  if (isValidVal(raw.tien_ich_free)) {
    minObj.uu_dai_mxh = String(raw.tien_ich_free).trim();
  } else if (isValidVal(raw.uudaitrong)) {
    minObj.uu_dai_mxh = String(raw.uudaitrong).trim();
  }

  if (isValidVal(raw.dangky)) {
    minObj.cu_phap_dang_ky = String(raw.dangky).trim();
  }

  return minObj;
}

/**
 * Chuyển danh sách gói cước thành JSON String sạch
 */
function packagesToXml(packages) {
  if (!packages || !Array.isArray(packages) || packages.length === 0) {
    return '[]';
  }
  const minimalList = packages.map(packageToMinimalJson);
  return JSON.stringify(minimalList, null, 2);
}

/**
 * Xây dựng prompt hoàn chỉnh cho Pass 2 AI
 */
const buildPrompt = (userMessage, packages, intent = {}, history = []) => {
  const isEmpty = !packages || !Array.isArray(packages) || packages.length === 0;
  const minimalJsonContext = packagesToXml(packages);

  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = 'Lịch sử trò chuyện gần đây:\n' +
      history.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') +
      '\n\n';
  }

  let scenarioGuide = '';
  if (isEmpty) {
    if (intent && intent.target_package) {
      scenarioGuide = `DỮ LIỆU MONGODB: 0 gói cước. Mã gói "${intent.target_package}" không tồn tại trong CSDL. BẮT BUỘC trả lời: "Dạ, hiện tại Viettel chưa có/không hỗ trợ gói cước ${intent.target_package}. Bạn kiểm tra lại tên gói cước giúp mình nhé!"`;
    } else {
      scenarioGuide = `DỮ LIỆU MONGODB: 0 gói cước. BẮT BUỘC trả lời: "Dạ xin lỗi bạn, hiện tại Viettel chưa có gói cước nào khớp chính xác với toàn bộ yêu cầu và ngân sách của bạn. Bạn có thể thay đổi số tiền hoặc nhu cầu để mình kiểm tra lại nhé."`;
    }
  } else {
    scenarioGuide = `DỮ LIỆU MONGODB: Có ${packages.length} gói cước (${packages.map(p => p.ma_goi).join(', ')}). BẮT BUỘC tuân thủ các NGUYÊN TẮC THÉP: tư vấn ngắn gọn trực diện, xưng "Chào bạn" hoặc "Dạ", chỉ dùng thông tin gói trong Context, CẤM bịa cú pháp SMS (soạn tin/191) và hướng dẫn khách "Bạn xem chi tiết và bấm đăng ký nhanh ở thông tin ngay bên dưới nhé."`;
  }

  const userPrompt = `${historyContext}[Câu hỏi của khách]: "${userMessage}"

[Danh sách gói cước được cung cấp]:
${minimalJsonContext}

[Hướng dẫn xử lý]: ${scenarioGuide}`;

  return {
    systemInstruction: SYSTEM_PROMPT_RESPONSE_GENERATOR,
    userPrompt: userPrompt,
    toString() {
      return `${SYSTEM_PROMPT_RESPONSE_GENERATOR}\n\n${userPrompt}`;
    }
  };
};

module.exports = {
  buildPrompt,
  packagesToXml,
  SYSTEM_PROMPT_RESPONSE_GENERATOR
};