/**
 * Package Sanitizer — lọc dữ liệu dành riêng cho AI.
 * Chỉ giữ lại các trường phục vụ tư vấn gói cước để giảm tải context cho AI.
 * Đồng thời xử lý thông minh để ẩn/hiện các giá trị "0" hoặc "Không" dựa vào Intent của người dùng.
 */

const ALLOWED_AI_FIELDS = [
  'ma_goi',
  'ten',
  'gia',
  'chu_ky_ngay',
  'phan_loai_goi',
  'data_theo_ngay',
  'free_noi_mang',
  'free_ngoai_mang',
  'sms',
  'tien_ich_free',
  'noi_dung_ngoai',
  'uudaitrong',
  'doi_tuong_ap_dung',
  'dangky',
  'system_type',
  'benefit_group'
];

/**
 * Kiểm tra xem người dùng có đang hỏi trực tiếp về các trường "0" này hay không.
 * Nếu có hỏi về nhu cầu tương ứng thì vẫn giữ lại field "0" để AI biết trả lời chính xác.
 */
const shouldKeepZeroValue = (field, intent, userMessage) => {
  if (!intent) return false;
  const lowerMsg = userMessage ? userMessage.toLowerCase() : '';

  if (field === 'sms') {
    return !!(
      intent.needSms || 
      lowerMsg.includes('sms') || 
      lowerMsg.includes('tin nhắn') || 
      lowerMsg.includes('tin nhan') || 
      lowerMsg.includes('nhắn tin') || 
      lowerMsg.includes('nhan tin')
    );
  }

  if (field === 'free_noi_mang' || field === 'free_ngoai_mang') {
    return !!(
      intent.needVoice || 
      intent.needCombo ||
      lowerMsg.includes('gọi') || 
      lowerMsg.includes('goi') || 
      lowerMsg.includes('thoại') || 
      lowerMsg.includes('thoai') || 
      lowerMsg.includes('phút') || 
      lowerMsg.includes('phut') || 
      lowerMsg.includes('nội mạng') || 
      lowerMsg.includes('noi mang') || 
      lowerMsg.includes('ngoại mạng') || 
      lowerMsg.includes('ngoai mang') || 
      lowerMsg.includes('call')
    );
  }

  if (field === 'data_theo_ngay') {
    return !!(
      intent.needData || 
      intent.needCombo ||
      lowerMsg.includes('data') || 
      lowerMsg.includes('mạng') || 
      lowerMsg.includes('mang') || 
      lowerMsg.includes('internet') || 
      lowerMsg.includes('gb') || 
      lowerMsg.includes('mb') || 
      lowerMsg.includes('dung lượng') || 
      lowerMsg.includes('dung luong')
    );
  }

  if (field === 'tien_ich_free' || field === 'uudaitrong') {
    return !!(
      intent.needYoutube ||
      intent.needTiktok ||
      intent.needFacebook ||
      intent.needTV360 ||
      intent.needMovie ||
      intent.needSocial ||
      lowerMsg.includes('youtube') ||
      lowerMsg.includes('yt') ||
      lowerMsg.includes('tiktok') ||
      lowerMsg.includes('facebook') ||
      lowerMsg.includes('fb') ||
      lowerMsg.includes('tv360') ||
      lowerMsg.includes('phim') ||
      lowerMsg.includes('movie') ||
      lowerMsg.includes('tiện ích') ||
      lowerMsg.includes('tien ich') ||
      lowerMsg.includes('ưu đãi') ||
      lowerMsg.includes('uu dai')
    );
  }

  return false;
};

/**
 * Kiểm tra xem giá trị có thuộc diện vô nghĩa đối với AI hay không.
 */
const isUselessValue = (field, val, intent, userMessage) => {
  if (val === undefined || val === null) {
    return true;
  }

  // Nếu người dùng có nhu cầu/hỏi trực tiếp về chủ đề này, ta PHẢI giữ lại field cước dù giá trị là 0 hoặc "Không"
  if (shouldKeepZeroValue(field, intent, userMessage)) {
    if (typeof val === 'string') {
      return val.trim() === ''; // Chỉ loại bỏ chuỗi rỗng thực sự
    }
    return false; // Giữ nguyên số 0, chuỗi "0" hoặc "Không"
  }

  // Mặc định: loại bỏ các giá trị 0, "0", null, rỗng, không có
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed === '' ||
      trimmed === '0' ||
      trimmed === 'n/a' ||
      trimmed === '-' ||
      trimmed === 'không' ||
      trimmed === 'khong' ||
      trimmed === 'none'
    );
  }

  if (typeof val === 'number') {
    return val === 0;
  }

  if (Array.isArray(val)) {
    return val.length === 0;
  }

  if (typeof val === 'object') {
    return Object.keys(val).length === 0;
  }

  return false;
};

/**
 * Chuyển đổi một package MongoDB thành AI View Model đã được sanitize.
 */
const sanitizeForAI = (pkg, intent, userMessage) => {
  if (!pkg) return null;
  
  // Hỗ trợ cả document mongoose (toObject) hoặc raw object
  const rawObj = typeof pkg.toObject === 'function' ? pkg.toObject() : pkg;
  const aiViewModel = {};

  for (const field of ALLOWED_AI_FIELDS) {
    const val = rawObj[field];
    if (!isUselessValue(field, val, intent, userMessage)) {
      if (typeof val === 'string') {
        aiViewModel[field] = val.trim();
      } else {
        aiViewModel[field] = val;
      }
    }
  }

  return aiViewModel;
};

/**
 * Nhận một package hoặc danh sách package MongoDB và trả về AI View Model tương ứng.
 */
const packageSanitizer = (packages, intent, userMessage) => {
  if (!packages) return [];
  if (Array.isArray(packages)) {
    return packages.map(pkg => sanitizeForAI(pkg, intent, userMessage)).filter(Boolean);
  }
  const sanitized = sanitizeForAI(packages, intent, userMessage);
  return sanitized ? [sanitized] : [];
};

module.exports = {
  packageSanitizer,
  sanitizeForAI,
  ALLOWED_AI_FIELDS
};
