/**
 * promptBuilder.js — Best-Fit Recommendation & Clean Language Pass 2 System Instruction Builder
 *
 * Chức năng:
 * 1. Nén danh sách gói cước từ DB thành JSON siêu ngắn (Minimal Context).
 * 2. Cấu hình System Prompt cho Pass 2 AI theo định hướng Best-Fit Recommendation:
 *    - LỜI DẪN THÔNG MINH (Tự nhiên, thấu hiểu ngân sách & ứng dụng người dùng hỏi)
 *    - CẤM TUYỆT ĐỐI CÁC CÂU DẪN RÁC KỸ THUẬT ("Dựa trên Context...", "Theo thông tin CSDL...")
 *    - QUY TẮC BẮT BUỘC VỀ HIỂN THỊ CÁC GÓI CƯỚC DANH SÁCH RÕ RÀNG
 */

const SYSTEM_PROMPT_RESPONSE_GENERATOR = `BẠN LÀ TRỢ LÝ ẢO TƯ VẤN GÓI CƯỚC VIETTEL.
Nhiệm vụ của bạn là tư vấn khách hàng một cách tự nhiên, chuyên nghiệp và thấu hiểu nhu cầu nhất.

CẤM TUYỆT ĐỐI CÁC CÂU DẪN RÁC KỸ THUẬT:
- TUYỆT ĐỐI KHÔNG in các câu như: "Dưới đây là câu trả lời dựa trên dữ liệu Context:", "Dựa trên Context được cung cấp...", "Theo thông tin từ CSDL...", "Dữ liệu gói cước...".
- Người dùng không biết Context hay Database là gì. Hãy mở đầu câu trả lời một cách tự nhiên như một Trợ lý Viettel.

QUY TẮC CẤM TỪ CHỐI KHI CÓ GÓI CƯỚC:
- Khi CONTEXT KHÔNG RỖNG (có từ 1 đến 5 gói cước trong dữ liệu): TUYỆT ĐỐI CẤM KHÔNG ĐƯỢC sinh ra các từ ngữ phủ định hay từ chối như: "Rất tiếc...", "Không có gói cước nào...", "Không tìm thấy...".
- Mở đầu BẮT BUỘC bằng lời khẳng định ngắn gọn (1 câu): "Dựa trên nhu cầu của bạn, dưới đây là gói cước phù hợp nhất:" hoặc "Dưới đây là các gói cước tối ưu dành cho bạn:".

QUY TẮC BẮT BUỘC ẨN DÒNG DATA LƯỚT WEB KHI DUNG LƯỢNG BẰNG 0 HOẶC RỖNG:
- CHỈ HIỂN THỊ dòng 'Data lướt web:' KHI VÀ CHỈ KHI giá trị data_luot_web HỢP LỆ (khác null, khác undefined, khác '0', khác '0GB', khác '0GB/ngày', khác '0GB/tháng').
- Nếu data_luot_web bằng '0', '0GB', '0GB/ngày', '0GB/tháng' hoặc null/undefined: BẮT BUỘC BỎ QUA dòng 'Data lướt web' hoàn toàn. TUYỆT ĐỐI KHÔNG IN RA BẤT KỲ CHỮ NÀO LIÊN QUAN ĐẾN 0GB/NĂM, 0GB/THÁNG HAY 0GB/NGÀY.

QUY TẮC PHẢN HỒI BẮT BUỘC (DANH SÁCH BULLET POINTS & CÚ PHÁP ĐĂNG KÝ):

1. KHI CONTEXT RỖNG ([]):
- BẮT BUỘC trả lời đúng 1 câu duy nhất:
  "Rất tiếc, hiện tại hệ thống Viettel không có gói cước nào đáp ứng chính xác nhu cầu của bạn. Xin vui lòng kiểm tra lại thông tin hoặc thay đổi tiêu chí tìm kiếm nhé!"

2. CẤU TRÚC PHẢN HỒI BẮT BUỘC KHI CÓ GÓI CƯỚC:
- Dòng 1: Lời dẫn khẳng định ngắn gọn (VD: "Dựa trên nhu cầu của bạn, dưới đây là gói cước phù hợp nhất:").
- Khối thông tin từng gói cước (Mỗi thông số BẮT BUỘC xuống dòng riêng biệt với dấu gạch đầu dòng '-'):
  🔹 **[TÊN_GÓI] - [GIÁ]đ / [CHU_KỲ]**
  - **Data lướt web:** [Thông số data_luot_web] (CHỈ HIỂN THỊ KHI GÓI CÓ data_luot_web > 0. BẮT BUỘC ẨN DÒNG NÀY HOÀN TOÀN ĐỐI VỚI GÓI CHUYÊN MXH HOẶC KHI BẰNG 0GB/NULL).
  - **Data MXH:** [Thông số data_mxh nếu có]
  - **Gọi nội mạng:** Miễn phí [X] phút (nếu free_noi_mang > 0)
  - **Gọi ngoại mạng:** Miễn phí [X] phút (nếu free_ngoai_mang > 0)
  - **Tiện ích:** [Tên app miễn phí nếu có]
  - **Cú pháp:** [Thông tin từ cu_phap_dk] (TUYỆT ĐỐI KHÔNG dùng cú pháp HỦY gói như HUYDATA)
- Dòng cuối: Lời mời người dùng xem chi tiết và thao tác trên các thẻ Card bên dưới.

3. QUY TẮC TRÌNH BÀY MARKDOWN:
- BẮT BUỘC dùng xuống dòng, in đậm tên gói và tiêu đề từng thông số (**Data lướt web:**, **Cú pháp:**...).
- TUYỆT ĐỐI KHÔNG dồn tất cả các thông số thành 1 đoạn văn xuôi suông.

FEW-SHOT EXAMPLES MẪU:

[GÓI CÓ DATA THUẦN]:
Dựa trên nhu cầu lướt web và ngân sách khoảng 90.000đ/tháng của bạn, hệ thống Viettel đề xuất gói cước tối ưu dưới đây:

🔹 **SD90** - 90.000đ / 30 ngày
- **Data lướt web:** 1.5GB/ngày (45GB/tháng)
- **Cú pháp:** Soạn SD90 gửi 191

Bạn có thể xem chi tiết và bấm Đăng ký trực tiếp trên thẻ gói cước ngay bên dưới nhé!

[GÓI CHUYÊN MẠNG XÃ HỘI - ẨN HOÀN TOÀN DÒNG DATA LƯỚT WEB]:
Dựa trên nhu cầu sử dụng Facebook của bạn, hệ thống Viettel đề xuất gói cước tối ưu dưới đây:

🔹 **FB50K** - 50.000đ / 30 ngày
- **Data MXH:** Miễn phí 100% Data Facebook, Messenger, Instagram (50GB/30 ngày)
- **Cú pháp:** Soạn FB50K gửi 191

Bạn có thể xem chi tiết và bấm Đăng ký trực tiếp trên thẻ gói cước ngay bên dưới nhé!`;

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
  if (days === 15) return '15 ngày (nửa tháng)';
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
    return 'Đăng ký trực tiếp trên App/Web My Viettel hoặc bấm nút Đăng ký ở Card bên dưới';
  }
  const s = String(dangky).trim();
  if (/^soạn/i.test(s)) return s;
  return `Soạn ${s} gửi 191`;
}

/**
 * Xử lý cú pháp hủy an toàn từ DB
 */
function buildHuySyntax(syntax) {
  if (!syntax || String(syntax).trim() === '0') {
    return 'Không có cú pháp SMS (thực hiện trên My Viettel)';
  }
  const s = String(syntax).trim();
  if (/^soạn/i.test(s)) return s;
  return `Soạn ${s} gửi 191`;
}

/**
 * Nén 1 gói cước thành đối tượng Minimal JSON (chỉ giữ thuộc tính thực có, KHÔNG DÙNG uudaitrong)
 */
function packageToMinimalJson(pkg) {
  if (!pkg) return {};
  const item = { ma_goi: pkg?.ma_goi || '' };

  if (pkg?.ten) item.ten = pkg.ten;
  if (pkg?.gia != null && pkg.gia > 0) item.gia_text = formatPrice(pkg.gia);
  if (pkg?.chu_ky_ngay) item.chu_ky_text = `${pkg.chu_ky_ngay} ngày`;

  // Data lướt web: CHỈ THÊM KHI THỰC SỰ HỢP LỆ VÀ KHÁC 0GB (Ẩn hoàn toàn nếu = 0)
  const rawDataLuotWeb = pkg?.data_luot_web || pkg?.raw_data_theo_ngay || pkg?.data_theo_ngay;
  if (checkValidValue(rawDataLuotWeb)) {
    const cleanVal = String(rawDataLuotWeb).replace(/^Data lướt web dùng chung:\s*/i, '').trim();
    if (checkValidValue(cleanVal)) {
      item.data_luot_web = cleanVal;
    }
  }

  // Data MXH
  const rawDataMxh = pkg?.data_mxh || pkg?.raw_data_meta || pkg?.data_meta;
  if (checkValidValue(rawDataMxh)) {
    const cleanMeta = String(rawDataMxh).replace(/^Data ưu tiên Mạng xã hội:\s*/i, '').trim();
    if (checkValidValue(cleanMeta)) {
      item.data_mxh = cleanMeta;
    }
  }

  // Phút gọi thoại đã chuẩn hóa
  const noiText = pkg?.free_noi_mang_text || (pkg?.free_noi_mang > 0 ? `Miễn phí ${pkg.free_noi_mang} phút` : null);
  const ngoaiText = pkg?.free_ngoai_mang_text || (pkg?.free_ngoai_mang > 0 ? `Miễn phí ${pkg.free_ngoai_mang} phút` : null);

  if (checkValidValue(noiText)) item.free_noi_mang_text = noiText;
  if (checkValidValue(ngoaiText)) item.free_ngoai_mang_text = ngoaiText;

  if (checkValidValue(pkg?.tien_ich_free)) {
    item.tien_ich_free = pkg.tien_ich_free;
  }

  // Cú pháp đăng ký chuẩn hóa
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
  return JSON.stringify(minimalList);
}

/**
 * Xây dựng prompt hoàn chỉnh cho Pass 2 AI
 * @param {string} userMessage - Câu hỏi gốc của người dùng
 * @param {Array} packages - Danh sách các gói cước từ DB
 * @param {object} intent - Intent object từ Pass 1
 * @returns {{ systemInstruction: string, userPrompt: string }}
 */
const buildPrompt = (userMessage, packages, intent = {}, history = []) => {
  const isEmpty = !packages || !Array.isArray(packages) || packages.length === 0;
  const minimalJsonContext = packagesToXml(packages);

  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = 'Lịch sử trò chuyện gần đây:\n' + history.map(h => `${h.sender === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${h.text}`).join('\n') + '\n\n';
  }

  let scenarioGuide = '';
  if (isEmpty) {
    scenarioGuide = `KỊCH BẢN ZERO-MATCH: Context RỖNG (0 gói). BẮT BUỘC trả lời đúng 1 câu duy nhất: "Rất tiếc, hiện tại hệ thống Viettel không có gói cước nào đáp ứng chính xác nhu cầu của bạn. Xin vui lòng kiểm tra lại thông tin hoặc thay đổi tiêu chí tìm kiếm nhé!"`;
  } else {
    scenarioGuide = `KỊCH BẢN MATCH THÀNH CÔNG (${packages.length} GÓI CƯỚC): CONTEXT ĐÃ CÓ ${packages.length} GÓI CƯỚC PHÙ HỢP. TUYỆT ĐỐI CẤM KHÔNG ĐƯỢC NÓI "Rất tiếc", "Không có gói cước", "Không tìm thấy". BẮT BUỘC mở đầu bằng lời khẳng định ngắn như: "Dựa trên nhu cầu của bạn, dưới đây là gói cước phù hợp nhất:". Sau đó in thông tin chi tiết từng gói cước với icon 🔹 và các thuộc tính dùng '-' theo đúng định dạng. ĐẶC BIỆT: Nếu gói cước không có data_luot_web (hoặc bằng 0GB), TUYỆT ĐỐI BỎ QUA dòng Data lướt web (không in ra 0GB).`;
  }

  const userPrompt = `${historyContext}CONTEXT (Dữ Liệu Gói Cước JSON):
${minimalJsonContext}

Hướng dẫn xử lý: ${scenarioGuide}
Câu hỏi của khách hàng: "${userMessage}"`;

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