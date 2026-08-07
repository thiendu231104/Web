/**
 * promptBuilder.js — Grounded Response Prompt Generator (LLM Pass 2)
 *
 * Chức năng:
 * 1. Chuyển đổi danh sách gói cước được Backend truy vấn từ MongoDB thành Minimal JSON Context.
 * 2. Xây dựng System Instruction & User Prompt tuân thủ nghiêm ngặt nguyên tắc RAG Grounding:
 *    - NGUYÊN TẮC SOURCE OF TRUTH: MongoDB là dữ liệu duy nhất. Không bịa đặt gói cước hay ưu đãi.
 *    - KHÔNG DÙNG TỪ NGỮ KỸ THUẬT: Không bao giờ in "Theo Context", "Theo CSDL", "Dữ liệu JSON".
 *    - ĐỊNH DẠNG RÕ RÀNG: Trình bày từng gói cước theo dạng danh sách bullet points đẹp mắt với cú pháp đăng ký chuẩn.
 */

const SYSTEM_PROMPT_RESPONSE_GENERATOR = `BẠN LÀ TRỢ LÝ ẢO TƯ VẤN GÓI CƯỚC DI ĐỘNG VIETTEL.
Nhiệm vụ của bạn là đưa ra lời dẫn tự nhiên, ngắn gọn và định hướng người dùng xem/đăng ký gói cước.

NGUYÊN TẮC CHỐNG ẢO GIÁC (ANTI-HALLUCINATION & RAG GROUNDING):
1. MONGODB LÀ SOURCE OF TRUTH DUY NHẤT:
   - Tất cả thông tin gói cước CHỈ ĐƯỢC LẤY TỪ DỮ LIỆU CONTEXT ĐƯỢC BACKEND CUNG CẤP.
   - TUYỆT ĐỐI KHÔNG tự tạo ra hoặc tự bịa tên gói cước, mức giá, ưu đãi không có trong dữ liệu.

2. CẤM CÂU DẪN RÁC KỸ THUẬT:
   - KHÔNG in các câu như: "Dựa trên Context...", "Theo CSDL...", "Dữ liệu gói cước JSON...".

3. QUY TẮC HIỂN THỊ THÔNG TIN (TỐI ƯU CHO UI CARDS):
   - Phía Client ĐÃ CÓ sẵn các Thẻ UI (UI Cards) hiển thị chi tiết thông số gói cước bên dưới.
   - Vì vậy, câu trả lời dạng văn bản của bạn CHỈ CẦN:
     + 01 Lời mở đầu ngắn gọn (1 câu), gọi tên các gói cước phù hợp nhất.
     + 01 Lời nhắn nhẹ nhàng hướng dẫn khách hàng tham khảo chi tiết hoặc bấm nút "Đăng ký" ngay tại các Thẻ thông tin phía dưới.
   - CẤM TUYỆT ĐỐI: Không tự liệt kê lại chi tiết toàn bộ thông số (Phút gọi, Data, Cú pháp) thành danh sách dạng văn bản dài dòng.

4. XỬ LÝ KHI KHÔNG TÌM THẤY GÓI (CONTEXT RỖNG):
   - Thông báo lịch sự rằng chưa tìm thấy gói khớp chính xác tuyệt đối, gợi ý khách thay đổi mốc ngân sách hoặc chu kỳ.

5. NẾU YÊU CẦU CHƯA RÕ RÀNG:
   - Trả lời thân thiện và chủ động hỏi lại 1 câu ngắn gọn để làm rõ nhu cầu.`;

/**
 * Format số tiền VND thành chuỗi dễ đọc
 */
function formatPrice(price) {
  if (price == null || isNaN(Number(price))) return '0đ';
  return Number(price).toLocaleString('vi-VN') + 'đ';
}

/**
 * Format chu kỳ ngày thành chuỗi dễ đọc
 */
function formatCycle(chu_ky_ngay) {
  const days = parseInt(chu_ky_ngay, 10);
  if (isNaN(days) || days <= 0) return chu_ky_ngay || '30 ngày';
  if (days === 360) return '360 ngày (1 năm)';
  if (days === 180) return '180 ngày (6 tháng)';
  if (days === 90) return '90 ngày (3 tháng)';
  if (days === 30) return '30 ngày (1 tháng)';
  if (days === 15) return '15 ngày';
  if (days === 7) return '7 ngày (1 tuần)';
  return `${days} ngày`;
}

/**
 * Kiểm tra xem chuỗi có dữ liệu hợp lệ thực sự không
 */
function checkValidValue(val) {
  if (!val) return false;
  const s = String(val).trim().toUpperCase();
  return (
    s !== '' &&
    s !== '0' &&
    s !== '0GB' &&
    s !== '0 GB' &&
    s !== '0GB/NGÀY' &&
    s !== '0GB/NGAY' &&
    s !== '0 GB/NGÀY' &&
    s !== '0 GB/NGAY' &&
    s !== '0GB/THÁNG' &&
    s !== '0GB/THANG' &&
    s !== '0 GB/THÁNG' &&
    s !== '0 GB/THANG' &&
    s !== '0 PHÚT' &&
    s !== '0 PHUT' &&
    s !== '0 SMS' &&
    s !== 'NULL' &&
    s !== 'UNDEFINED' &&
    s !== 'KHÔNG' &&
    s !== 'KHONG' &&
    s !== 'KHÔNG CÓ' &&
    s !== 'KHONG CO'
  );
}

/**
 * Xử lý cú pháp đăng ký an toàn từ DB
 */
function buildDangKy(dangky, maGoi) {
  if (!dangky || String(dangky).trim() === '0') {
    return `Soạn ${maGoi || ''} gửi 191`;
  }
  const s = String(dangky).trim();
  if (/^soạn/i.test(s)) return s;
  return `Soạn ${s} gửi 191`;
}

/**
 * Nén 1 gói cước thành đối tượng Minimal JSON
 */
function packageToMinimalJson(pkg) {
  if (!pkg) return {};
  const item = { ma_goi: pkg?.ma_goi || '' };

  if (pkg?.ten) item.ten = pkg.ten;
  if (pkg?.gia != null && pkg.gia >= 0) item.gia_text = formatPrice(pkg.gia);
  if (pkg?.chu_ky_ngay) item.chu_ky_text = formatCycle(pkg.chu_ky_ngay);

  const rawDataLuotWeb = pkg?.data_luot_web || pkg?.raw_data_theo_ngay || pkg?.data_theo_ngay;
  if (checkValidValue(rawDataLuotWeb)) {
    const cleanVal = String(rawDataLuotWeb).replace(/^Data lướt web dùng chung:\s*/i, '').trim();
    if (checkValidValue(cleanVal)) {
      item.data_luot_web = cleanVal;
    }
  }

  const rawDataMxh = pkg?.data_mxh || pkg?.raw_data_meta || pkg?.data_meta;
  if (checkValidValue(rawDataMxh)) {
    const cleanMeta = String(rawDataMxh).replace(/^Data ưu tiên Mạng xã hội:\s*/i, '').trim();
    if (checkValidValue(cleanMeta)) {
      item.data_mxh = cleanMeta;
    }
  }

  const noiText = pkg?.free_noi_mang_text || (pkg?.free_noi_mang > 0 ? `Miễn phí ${pkg.free_noi_mang} phút` : null);
  const ngoaiText = pkg?.free_ngoai_mang_text || (pkg?.free_ngoai_mang > 0 ? `Miễn phí ${pkg.free_ngoai_mang} phút` : null);

  if (checkValidValue(noiText)) item.free_noi_mang_text = noiText;
  if (checkValidValue(ngoaiText)) item.free_ngoai_mang_text = ngoaiText;

  if (checkValidValue(pkg?.tien_ich_free)) {
    item.tien_ich_free = pkg.tien_ich_free;
  }

  if (pkg?.cu_phap_dk) {
    item.cu_phap_dk = pkg.cu_phap_dk;
  } else {
    item.cu_phap_dk = buildDangKy(pkg?.dangky, pkg?.ma_goi);
  }

  return item;
}

/**
 * Chuyển mảng danh sách gói cước thành chuỗi JSON Minimal
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

  let intentSummaryText = '';
  if (intent && intent.user_intent_summary) {
    intentSummaryText = `Nhu cầu thực sự của khách hàng đã được trích xuất: "${intent.user_intent_summary}"\n`;
  }

  let scenarioGuide = '';
  if (isEmpty) {
    scenarioGuide = `DỮ LIỆU MONGODB: 0 gói cước khớp chính xác. Hãy phản hồi lịch sự rằng hiện chưa tìm thấy gói cước đáp ứng 100% tiêu chí và hỏi khách hàng có muốn điều chỉnh khoảng giá hoặc thời gian sử dụng không.`;
  } else {
    scenarioGuide = `DỮ LIỆU MONGODB: Có ${packages.length} gói cước được đề xuất bên dưới. Hãy trình bày tự nhiên, hấp dẫn, nêu rõ vì sao gói cước phù hợp với nhu cầu của khách hàng. Tuân thủ định dạng bullet points và hiển thị cú pháp đăng ký chuẩn.`;
  }

  const userPrompt = `${historyContext}${intentSummaryText}CONTEXT (Dữ Liệu Gói Cước Thực Tế Từ MongoDB):
${minimalJsonContext}

Hướng dẫn xử lý: ${scenarioGuide}
Tin nhắn của khách hàng: "${userMessage}"`;

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