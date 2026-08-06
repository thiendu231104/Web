const SurveyConfig = require('../models/SurveyConfig');
const SurveyHistory = require('../models/SurveyHistory');
const Package = require('../models/Package');
const Account = require('../models/Account');
const PackageFeature = require('../models/PackageFeature');
const { getPackageContext } = require('./chatbot/packageContext');
const { canViewPackage } = require('../utils/permission');
const { mapToEnglish } = require('../controllers/packageController');

/**
 * Tiện ích kiểm tra thông số gói cước thực tế từ CSDL
 */
function hasRealData(pkg) {
  if (!pkg.data_theo_ngay) return false;
  const s = String(pkg.data_theo_ngay).trim().toUpperCase();
  if (s === '0' || s === '0GB' || s === '0 GB' || s.startsWith('0')) return false;
  return true;
}

function hasRealVoice(pkg) {
  const check = (val) => {
    if (!val) return false;
    const s = String(val).trim().toUpperCase();
    return s !== '0' && s !== '0 PHÚT' && s !== '0 PHUT' && !s.startsWith('0');
  };
  return check(pkg.free_noi_mang) || check(pkg.free_ngoai_mang);
}

function hasRealSms(pkg) {
  if (!pkg.sms) return false;
  const s = String(pkg.sms).trim().toUpperCase();
  return s !== '0' && s !== '0 SMS' && s !== '0 TIN NHẮN' && !s.startsWith('0');
}

function getDailyGb(pkg) {
  if (!pkg.data_theo_ngay) return 0;
  const str = String(pkg.data_theo_ngay).trim().toUpperCase();
  const matchDay = str.match(/([\d.]+)\s*GB\s*\/\s*(NGÀY|NGAY|D|DAY)/i);
  if (matchDay) return parseFloat(matchDay[1]);
  const matchMonth = str.match(/([\d.]+)\s*GB\s*\/\s*(THÁNG|THANG|M|MONTH)/i);
  if (matchMonth) return parseFloat(matchMonth[1]) / 30;
  const matchRaw = str.match(/([\d.]+)\s*GB/i);
  if (matchRaw) return parseFloat(matchRaw[1]) / (parseInt(pkg.chu_ky_ngay) || 30);
  return 0;
}

function checkKeyword(pkg, keyword) {
  const regex = new RegExp(keyword, 'i');
  return !!(
    (pkg.benefit_group && regex.test(pkg.benefit_group)) ||
    (pkg.tien_ich_free && regex.test(pkg.tien_ich_free)) ||
    (pkg.uudaitrong && regex.test(pkg.uudaitrong)) ||
    (pkg.dieu_kien_dang_ky && regex.test(pkg.dieu_kien_dang_ky)) ||
    (pkg.ten && regex.test(pkg.ten)) ||
    (pkg.noi_dung_ngoai && regex.test(pkg.noi_dung_ngoai)) ||
    (pkg.tienich && regex.test(pkg.tienich))
  );
}

/**
 * Đồng bộ hóa dữ liệu gói cước sang bảng PackageFeature
 */
async function syncPackageFeatures() {
  const packages = await Package.find();
  for (const pkg of packages) {
    const dailyGb = getDailyGb(pkg);
    const hasData = hasRealData(pkg);
    const hasVoice = hasRealVoice(pkg);
    const hasSms = hasRealSms(pkg);

    const benefitGroupUpper = (pkg.benefit_group || '').toString().toUpperCase().trim();
    const maGoiUpper = (pkg.ma_goi || '').toString().toUpperCase().trim();

    const hasFacebook = !!(pkg.tien_ich_free && /facebook/i.test(pkg.tien_ich_free));
    const hasTiktok   = !!(pkg.tien_ich_free && /tiktok/i.test(pkg.tien_ich_free));
    const hasYoutube  = !!(pkg.tien_ich_free && /youtube/i.test(pkg.tien_ich_free));
    const hasTv360    = !!(pkg.tien_ich_free && /tv360/i.test(pkg.tien_ich_free));
    const hasMovie    = !!(pkg.tien_ich_free && /movie|phim|cinema/i.test(pkg.tien_ich_free));

    const hasSocial = hasYoutube || hasTiktok || hasFacebook || hasTv360 || hasMovie || checkKeyword(pkg, 'social') || !!pkg.data_meta;
    const has5g = !!(pkg.loai_mang && pkg.loai_mang.toUpperCase().includes('5G'));
    
    const isCombo = benefitGroupUpper === 'COMBO' || pkg.phan_loai_goi === 'Combo' || pkg.service_group === 'COMBO' || (hasData && hasVoice);
    const isDataOnly = (benefitGroupUpper === 'DATA_MAIN' || (hasData && !hasVoice)) && !isCombo;
    const isSocial = ['YOUTUBE', 'TIKTOK', 'FACEBOOK', 'MOVIE', 'SOCIAL', 'APP_META', 'APP_TIKTOK', 'APP_YOUTUBE', 'APP_TV360'].includes(benefitGroupUpper) || pkg.phan_loai_goi === 'Social' || pkg.phan_loai_goi === 'MXH' || !!pkg.data_meta;
    const isAddon = pkg.is_addon === true || pkg.requires_base_package === true;
    
    const cycleDays = parseInt(pkg.chu_ky_ngay) || 30;
    const price = pkg.gia || 0;
    
    let priceLevel = 'medium';
    if (pkg.phan_khuc_gia === 'Gia_re' || price < 50000) priceLevel = 'cheap';
    else if (pkg.phan_khuc_gia === 'Cao_cap' || price >= 200000) priceLevel = 'expensive';
    
    let dataLevel = 'none';
    if (hasData) {
      const text = (pkg.data_theo_ngay || '' + pkg.dulieu || '').toLowerCase();
      if (text.includes('không giới hạn') || text.includes('unlimited') || text.includes('kgh') || dailyGb >= 5) {
        dataLevel = 'unlimited';
      } else if (dailyGb >= 3) {
        dataLevel = 'high';
      } else if (dailyGb >= 1) {
        dataLevel = 'medium';
      } else {
        dataLevel = 'low';
      }
    }
    
    let voiceLevel = 'none';
    if (hasVoice) {
      const parseMins = (val) => {
        if (!val) return 0;
        const match = String(val).match(/(\d+)\s*(phút|phut|min)/i);
        return match ? parseInt(match[1]) : 0;
      };
      const mins = parseMins(pkg.free_noi_mang) + parseMins(pkg.free_ngoai_mang);
      if (mins >= 1000) voiceLevel = 'high';
      else if (mins >= 500) voiceLevel = 'medium';
      else voiceLevel = 'low';
    }
    
    let smsLevel = 'none';
    if (hasSms) {
      const parseSms = (val) => {
        if (!val) return 0;
        const match = String(val).match(/(\d+)\s*(sms|tin nhắn|tin nhan|message)/i);
        return match ? parseInt(match[1]) : 0;
      };
      const smsCount = parseSms(pkg.sms);
      smsLevel = smsCount >= 100 ? 'high' : 'low';
    }

    const searchableTags = Array.from(new Set([
      pkg.ma_goi,
      pkg.ten,
      pkg.benefit_group,
      pkg.phan_loai_goi,
      hasYoutube ? 'youtube' : '',
      hasTiktok ? 'tiktok' : '',
      hasFacebook ? 'facebook' : '',
      hasFacebook ? 'meta' : '',
      hasTv360 ? 'tv360' : '',
      hasMovie ? 'movie' : '',
      hasSocial ? 'social' : ''
    ].filter(Boolean)));

    await PackageFeature.findOneAndUpdate(
      { package_id: pkg.package_id },
      {
        package_id: pkg.package_id,
        ma_goi: pkg.ma_goi,
        has_data: hasData,
        has_voice: hasVoice,
        has_sms: hasSms,
        has_youtube: hasYoutube,
        has_tiktok: hasTiktok,
        has_facebook: hasFacebook,
        has_tv360: hasTv360,
        has_movie: hasMovie,
        has_social: hasSocial,
        has_5g: has5g,
        is_combo: isCombo,
        is_data_only: isDataOnly,
        is_social: isSocial,
        is_addon: isAddon,
        cycle_days: cycleDays,
        price,
        price_level: priceLevel,
        data_level: dataLevel,
        voice_level: voiceLevel,
        sms_level: smsLevel,
        searchable_tags: searchableTags
      },
      { upsert: true, returnDocument: 'after' }
    );
  }
}

/**
 * QUY TRÌNH 3 BƯỚC CỐ ĐỊNH BAN ĐẦU (FIXED BASE PHASES)
 */
const FIXED_QUESTIONS = {
  phan_loai_goi: {
    field: 'phan_loai_goi',
    title: 'Bước 1: Nhu cầu cốt lõi',
    description: 'Lựa chọn loại hình dịch vụ di động chính bạn muốn sử dụng',
    component: 'single-choice',
    options: [
      { label: 'Chỉ Data lướt web', value: 'Data', detail: 'Chỉ lướt web, học tập & làm việc di động' },
      { label: 'Combo (Data + Gọi thoại)', value: 'Combo', detail: 'Tích hợp cả Data dung lượng lớn và phút gọi miễn phí' },
      { label: 'Mạng xã hội & Tiện ích', value: 'MXH', detail: 'Tập trung ưu đãi cước TikTok, YouTube, Facebook, TV360' }
    ]
  },
  phan_khuc_gia: {
    field: 'phan_khuc_gia',
    title: 'Bước 2: Khoảng Ngân Sách',
    description: 'Lựa chọn mức cước phí hàng tháng phù hợp khả năng tài chính',
    component: 'single-choice',
    options: [
      { label: 'Giá rẻ (Dưới 50.000đ / tháng)', value: 'Gia_re', detail: 'Tiết kiệm chi phí cước hàng tháng tối đa' },
      { label: 'Trung bình (50.000đ - 150.000đ)', value: 'Trung_binh', detail: 'Phân khúc phổ biến nhất với nhiều ưu đãi hot' },
      { label: 'Cao cấp (Trên 150.000đ / tháng)', value: 'Cao_cap', detail: 'Nhu cầu cao, Data dung lượng lớn & đàm thoại thả ga' }
    ]
  },
  chu_ky_ngay: {
    field: 'chu_ky_ngay',
    title: 'Bước 3: Chu Kỳ Sử Dụng',
    description: 'Lựa chọn thời hạn chu kỳ cước gói cước bạn mong muốn',
    component: 'single-choice',
    options: [
      { label: 'Dùng theo Ngày/Tuần (<= 15 ngày)', value: 'short', detail: 'Gói cước ngắn hạn khi đi du lịch hoặc công tác' },
      { label: 'Theo Tháng (30 ngày)', value: 'monthly', detail: 'Chu kỳ cước phổ thông thanh toán từng tháng' },
      { label: 'Chu kỳ dài (>= 90 ngày)', value: 'long', detail: 'Chu kỳ đa tháng / năm tiết kiệm chi phí gia hạn' }
    ]
  }
};

/**
 * CÁC BƯỚC TỰ SINH ĐỘNG TỪ BƯỚC 4 TRỞ ĐI (DYNAMIC PHASES)
 */
const DYNAMIC_QUESTIONS = {
  tien_ich_free: {
    field: 'tien_ich_free',
    title: 'Ứng dụng thường dùng được miễn cước Data 100%',
    description: 'Lựa chọn ứng dụng bạn sử dụng thường xuyên nhất',
    component: 'single-choice',
    options: [
      { label: 'TikTok', value: 'TikTok', detail: 'Miễn phí 100% cước Data lướt video TikTok' },
      { label: 'YouTube', value: 'YouTube', detail: 'Miễn phí 100% cước Data xem video YouTube HD' },
      { label: 'Facebook', value: 'Facebook', detail: 'Miễn phí 100% cước Data Facebook & Messenger' },
      { label: 'TV360', value: 'TV360', detail: 'Xem phim & truyền hình trực tuyến TV360' }
    ]
  },
  loai_mang: {
    field: 'loai_mang',
    title: 'Hạ tầng mạng di động ưu tiên',
    description: 'Lựa chọn công nghệ mạng ưu tiên cho thiết bị',
    component: 'single-choice',
    options: [
      { label: 'Mạng 4G LTE', value: '4G', detail: 'Tốc độ cao phổ thông toàn quốc' },
      { label: 'Mạng 5G siêu tốc', value: '5G', detail: 'Tốc độ vượt trội trên hạ tầng 5G Viettel' }
    ]
  },
  free_noi_mang: {
    field: 'free_noi_mang',
    title: 'Nhu cầu gọi thoại miễn phí',
    description: 'Nhu cầu gọi điện liên lạc nội/ngoại mạng của bạn',
    component: 'single-choice',
    options: [
      { label: 'Không cần phút gọi miễn phí', value: 'none', detail: 'Chủ yếu liên lạc online qua các ứng dụng OTT' },
      { label: 'Cần miễn phí phút gọi thoại', value: 'voice', detail: 'Tần suất đàm thoại liên lạc thoại nhiều' }
    ]
  }
};

/**
 * Kiểm tra tiêu chí ánh xạ chính xác với CSDL goi_cuoc & package_features
 */
function matchPackageCriteria(pkg, feat, field, value) {
  if (!value) return true;

  const fieldKey = String(field).toLowerCase();

  // 1. QUY TẮC MAPPING VÀ LỌC CÂU 1: Nhu cầu cốt lõi (Data / Combo / MXH)
  if (
    fieldKey === 'phan_loai_goi' ||
    fieldKey === 'question1' ||
    fieldKey === 'need_type' ||
    fieldKey === 'demand_branch'
  ) {
    const valUpper = String(value).toUpperCase();

    // 1.1 Data lướt web (Data thuần)
    if (valUpper === 'DATA' || valUpper === 'DATA_ONLY') {
      const hasData = hasRealData(pkg) || feat.has_data;
      if (!hasData) return false;
      return (
        pkg.benefit_group === 'DATA_MAIN' ||
        feat.has_data ||
        feat.is_data_only ||
        pkg.phan_loai_goi === 'Data'
      );
    }

    // 1.2 Combo (Data + Thoại)
    if (valUpper === 'COMBO') {
      const hasData = hasRealData(pkg) || !!(pkg.data_meta && String(pkg.data_meta).trim() !== '' && pkg.data_meta !== '0') || feat.has_data;
      const hasVoice = hasRealVoice(pkg) || feat.has_voice || (typeof pkg.free_noi_mang === 'number' && pkg.free_noi_mang > 0) || (typeof pkg.free_ngoai_mang === 'number' && pkg.free_ngoai_mang > 0);
      if (!hasData || !hasVoice) return false;
      return (
        pkg.benefit_group === 'COMBO' ||
        pkg.phan_loai_goi === 'Combo' ||
        feat.is_combo ||
        (hasData && hasVoice)
      );
    }

    // 1.3 MXH / Tiện ích (Meta, TikTok, YouTube...)
    if (valUpper === 'MXH' || valUpper === 'SOCIAL' || valUpper === 'SOCIAL_DEEP') {
      const hasMetaData = !!(pkg.data_meta && String(pkg.data_meta).trim() !== '' && pkg.data_meta !== '0');
      const hasTienIch = !!(pkg.tien_ich_free && String(pkg.tien_ich_free).trim() !== '' && pkg.tien_ich_free !== '0');
      const isSocialGroup = ['APP_META', 'APP_TIKTOK', 'APP_YOUTUBE', 'APP_TV360'].includes(pkg.benefit_group);
      
      return (
        hasMetaData ||
        hasTienIch ||
        isSocialGroup ||
        feat.is_social ||
        feat.has_social ||
        pkg.phan_loai_goi === 'Social' ||
        pkg.phan_loai_goi === 'MXH' ||
        feat.has_tiktok || feat.has_youtube || feat.has_facebook || feat.has_tv360
      );
    }
    return true;
  }

  // 2. CÂU 2: Khoảng ngân sách
  if (
    fieldKey === 'phan_khuc_gia' ||
    fieldKey === 'question2' ||
    fieldKey === 'budget' ||
    fieldKey === 'price_level'
  ) {
    const price = pkg.gia;
    const valUpper = String(value).toUpperCase();
    if (valUpper === 'GIA_RE' || valUpper === 'CHEAP' || valUpper === 'UNDER_50' || valUpper === 'UNDER_90') {
      return feat.price_level === 'cheap' || price <= 50000 || pkg.phan_khuc_gia === 'Gia_re';
    }
    if (valUpper === 'TRUNG_BINH' || valUpper === 'MEDIUM' || valUpper === '50_150' || valUpper === '90_150') {
      return feat.price_level === 'medium' || (price > 50000 && price <= 150000) || pkg.phan_khuc_gia === 'Trung_binh';
    }
    if (valUpper === 'CAO_CAP' || valUpper === 'EXPENSIVE' || valUpper === 'ABOVE_150') {
      return feat.price_level === 'expensive' || price > 150000 || pkg.phan_khuc_gia === 'Cao_cap';
    }
    return true;
  }

  // 3. CÂU 3: Chu kỳ ngày
  if (
    fieldKey === 'chu_ky_ngay' ||
    fieldKey === 'question3' ||
    fieldKey === 'cycle' ||
    fieldKey === 'cycle_preference'
  ) {
    const days = parseInt(pkg.chu_ky_ngay) || feat.cycle_days || 30;
    const valUpper = String(value).toUpperCase();
    if (valUpper === 'SHORT' || valUpper === 'DAILY') return days <= 15;
    if (valUpper === 'MONTHLY' || valUpper === 'MONTH') return days === 30 || (days > 15 && days <= 30);
    if (valUpper === 'LONG' || valUpper === 'LONG_TERM' || valUpper === 'YEARLY') return days >= 90;
    return true;
  }

  if (fieldKey === 'tien_ich_free' || fieldKey === 'primary_app' || fieldKey === 'app' || fieldKey === 'social_app') {
    const valUpper = String(value).toUpperCase().trim();

    if (valUpper.includes('TIKTOK')) {
      return !!(pkg.tien_ich_free && /tiktok/i.test(pkg.tien_ich_free));
    }
    if (valUpper.includes('YOUTUBE')) {
      return !!(pkg.tien_ich_free && /youtube/i.test(pkg.tien_ich_free));
    }
    if (valUpper.includes('TV360')) {
      return !!(pkg.tien_ich_free && /tv360/i.test(pkg.tien_ich_free));
    }
    if (valUpper.includes('FACEBOOK') || valUpper.includes('META') || valUpper === 'FB') {
      return !!(pkg.tien_ich_free && /facebook/i.test(pkg.tien_ich_free));
    }
    return true;
  }

  if (fieldKey === 'loai_mang') {
    const loai = (pkg.loai_mang || '').toUpperCase();
    const valUpper = String(value).toUpperCase();
    if (valUpper.includes('5G')) return feat.has_5g || loai.includes('5G');
    if (valUpper.includes('4G')) return !loai.includes('5G') || loai.includes('4G') || loai.includes('LTE');
    return true;
  }

  if (fieldKey === 'free_noi_mang') {
    const valUpper = String(value).toUpperCase();
    if (valUpper === 'NONE') return !feat.has_voice && !hasRealVoice(pkg);
    if (valUpper === 'VOICE') return feat.has_voice || hasRealVoice(pkg);
    return true;
  }

  return true;
}

/**
 * Lọc danh sách gói cước thỏa mãn các tiêu chí trong answers
 */
function filterCurrentPackages(allPackages, allFeaturesMap, answers) {
  return allPackages.filter(pkg => {
    const feat = allFeaturesMap[pkg.package_id || pkg.id] || {};
    for (const [field, value] of Object.entries(answers || {})) {
      if (value && !matchPackageCriteria(pkg, feat, field, value)) {
        return false;
      }
    }
    return true;
  });
}

function getSmartFallbackPackages(visiblePackages, allFeaturesMap, answers) {
  const fallbackList = [];
  const addedIds = new Set();

  const mapPackageWithFeatures = (pkg) => {
    const mapped = mapToEnglish(pkg);
    const feat = allFeaturesMap[pkg.package_id || pkg.id] || {};
    return {
      ...mapped,
      data_meta: pkg.data_meta || null,
      benefit_group: pkg.benefit_group || 'DATA_MAIN',
      has_data: feat.has_data !== undefined ? feat.has_data : false,
      has_voice: feat.has_voice !== undefined ? feat.has_voice : false,
      has_sms: feat.has_sms !== undefined ? feat.has_sms : false,
      has_tv360: feat.has_tv360 !== undefined ? feat.has_tv360 : false,
      has_youtube: feat.has_youtube !== undefined ? feat.has_youtube : false,
      has_tiktok: feat.has_tiktok !== undefined ? feat.has_tiktok : false,
      has_facebook: feat.has_facebook !== undefined ? feat.has_facebook : false,
      is_combo: feat.is_combo !== undefined ? feat.is_combo : false,
      is_social: feat.is_social !== undefined ? feat.is_social : false
    };
  };

  const answersNoCycle = { ...answers };
  delete answersNoCycle.chu_ky_ngay;
  const matchNoCycle = filterCurrentPackages(visiblePackages, allFeaturesMap, answersNoCycle);
  matchNoCycle.sort((a, b) => a.gia - b.gia);

  for (const pkg of matchNoCycle) {
    const id = pkg.package_id || pkg.id;
    if (!addedIds.has(id)) {
      fallbackList.push(mapPackageWithFeatures(pkg));
      addedIds.add(id);
      if (fallbackList.length >= 1) break;
    }
  }

  const answersNoPrice = { ...answers };
  delete answersNoPrice.phan_khuc_gia;
  const matchNoPrice = filterCurrentPackages(visiblePackages, allFeaturesMap, answersNoPrice);
  matchNoPrice.sort((a, b) => Math.abs(a.gia - 100000) - Math.abs(b.gia - 100000));

  for (const pkg of matchNoPrice) {
    const id = pkg.package_id || pkg.id;
    if (!addedIds.has(id)) {
      fallbackList.push(mapPackageWithFeatures(pkg));
      addedIds.add(id);
      if (fallbackList.length >= 2) break;
    }
  }

  const answersOnlyCat = { phan_loai_goi: answers.phan_loai_goi };
  const matchCatOnly = filterCurrentPackages(visiblePackages, allFeaturesMap, answersOnlyCat);
  matchCatOnly.sort((a, b) => a.gia - b.gia);

  for (const pkg of matchCatOnly) {
    const id = pkg.package_id || pkg.id;
    if (!addedIds.has(id)) {
      fallbackList.push(mapPackageWithFeatures(pkg));
      addedIds.add(id);
      if (fallbackList.length >= 3) break;
    }
  }

  if (fallbackList.length < 3) {
    for (const pkg of visiblePackages) {
      const id = pkg.package_id || pkg.id;
      if (!addedIds.has(id)) {
        fallbackList.push(mapPackageWithFeatures(pkg));
        addedIds.add(id);
        if (fallbackList.length >= 3) break;
      }
    }
  }

  return fallbackList.slice(0, 3);
}

/**
 * TỰ SINH BƯỚC ĐỘNG TỪ BƯỚC 4 (ĐẢM BẢO KHÔNG LẶP LẠI TRƯỜNG ĐÃ HỎI)
 */
function generateNextDynamicQuestion(currentPackages, allFeaturesMap, answeredFields) {
  const dynamicCandidateKeys = ['tien_ich_free', 'loai_mang', 'free_noi_mang'];
  const unansweredKeys = dynamicCandidateKeys.filter(k => !answeredFields.includes(k));

  let bestQuestion = null;
  let bestScore = -1;

  for (const key of unansweredKeys) {
    const def = DYNAMIC_QUESTIONS[key];
    if (!def) continue;

    const validOptions = [];
    const optionCounts = [];

    for (const opt of def.options) {
      const matched = currentPackages.filter(pkg => {
        const feat = allFeaturesMap[pkg.package_id || pkg.id] || {};
        return matchPackageCriteria(pkg, feat, key, opt.value);
      });

      if (matched.length > 0) {
        validOptions.push({
          ...opt,
          count: matched.length,
          detail: `${opt.detail} (${matched.length} gói cước)`
        });
        optionCounts.push(matched.length);
      }
    }

    if (validOptions.length >= 2) {
      let totalEliminated = 0;
      for (const count of optionCounts) {
        totalEliminated += (currentPackages.length - count);
      }
      const score = totalEliminated / optionCounts.length;

      if (score > bestScore) {
        bestScore = score;
        bestQuestion = {
          ...def,
          options: validOptions
        };
      }
    }
  }

  return bestQuestion;
}

const surveyService = {
  /**
   * Hybrid Adaptive Decision Tree Engine + Immediate Early Exit at Every Step
   */
  evaluateState: async (user, answers = {}) => {
    const allPackages = await getPackageContext();
    const visiblePackages = allPackages.filter(pkg => {
      const mapped = mapToEnglish(pkg);
      return canViewPackage(user, mapped);
    });

    const visibleIds = visiblePackages.map(pkg => pkg.package_id || pkg.id);
    const featuresList = await PackageFeature.find({ package_id: { $in: visibleIds } }).lean();

    const allFeaturesMap = {};
    featuresList.forEach(feat => {
      allFeaturesMap[feat.package_id] = feat;
    });

    const answeredFields = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '');
    const currentPackages = filterCurrentPackages(visiblePackages, allFeaturesMap, answers);
    currentPackages.sort((a, b) => a.gia - b.gia);

    const mapPackageWithFeatures = (pkg) => {
      const mapped = mapToEnglish(pkg);
      const feat = allFeaturesMap[pkg.package_id || pkg.id] || {};
      return {
        ...mapped,
        data_meta: pkg.data_meta || null,
        benefit_group: pkg.benefit_group || 'DATA_MAIN',
        has_data: feat.has_data !== undefined ? feat.has_data : false,
        has_voice: feat.has_voice !== undefined ? feat.has_voice : false,
        has_sms: feat.has_sms !== undefined ? feat.has_sms : false,
        has_tv360: feat.has_tv360 !== undefined ? feat.has_tv360 : false,
        has_youtube: feat.has_youtube !== undefined ? feat.has_youtube : false,
        has_tiktok: feat.has_tiktok !== undefined ? feat.has_tiktok : false,
        has_facebook: feat.has_facebook !== undefined ? feat.has_facebook : false,
        is_combo: feat.is_combo !== undefined ? feat.is_combo : false,
        is_social: feat.is_social !== undefined ? feat.is_social : false
      };
    };

    // KÍCH HOẠT KIỂM TRA DỪNG SỚM / SMART FALLBACK TỨC THÌ
    if (answeredFields.length > 0) {
      if (currentPackages.length === 0) {
        const fallbackPkgs = getSmartFallbackPackages(visiblePackages, allFeaturesMap, answers);
        return {
          isCompleted: true,
          status: 'SMART_FALLBACK',
          message: 'Không có gói cước thỏa mãn 100% tất cả tiêu chí. Hệ thống đã tự động chọn các gói cước gần nhất với nhu cầu.',
          packages: fallbackPkgs,
          nextQuestion: null,
          remainingCount: fallbackPkgs.length,
          currentStepNum: answeredFields.length
        };
      }

      // Nếu số gói cước sau khi lọc đã thu hẹp <= 5 -> Chuyển thẳng tới kết quả đề xuất
      if (currentPackages.length <= 5) {
        const mappedPkgs = currentPackages.map(pkg => mapPackageWithFeatures(pkg));

        return {
          isCompleted: true,
          status: 'EXACT_MATCH',
          message: `⚡ Đã khoanh vùng được ${currentPackages.length} gói cước phù hợp nhất!`,
          packages: mappedPkgs,
          nextQuestion: null,
          remainingCount: currentPackages.length,
          currentStepNum: answeredFields.length
        };
      }
    }

    // BƯỚC 1 CỐ ĐỊNH: Nhu cầu cốt lõi
    if (!answers.phan_loai_goi) {
      return {
        isCompleted: false,
        currentStepNum: 1,
        totalFixedSteps: 2,
        isDynamicPhase: false,
        nextQuestion: FIXED_QUESTIONS.phan_loai_goi,
        remainingCount: visiblePackages.length,
        answeredFields: []
      };
    }

    // BƯỚC 2 CỐ ĐỊNH: Khoảng ngân sách
    if (!answers.phan_khuc_gia) {
      return {
        isCompleted: false,
        currentStepNum: 2,
        totalFixedSteps: 2,
        isDynamicPhase: false,
        nextQuestion: FIXED_QUESTIONS.phan_khuc_gia,
        remainingCount: currentPackages.length,
        answeredFields: ['phan_loai_goi']
      };
    }

    // BƯỚC 3 TRỞ ĐI: DYNAMIC DECISION TREE DỰA VÀO CSDL THỰC TẾ
    if (!answers.chu_ky_ngay) {
      const availableCycles = new Set();
      currentPackages.forEach(pkg => {
        const feat = allFeaturesMap[pkg.package_id || pkg.id] || {};
        const days = parseInt(pkg.chu_ky_ngay) || feat.cycle_days || 30;
        if (days <= 15) availableCycles.add('short');
        else if (days <= 90) availableCycles.add('monthly');
        else availableCycles.add('long');
      });

      // Nếu có nhiều hơn 1 lựa chọn chu kỳ khả thi trong CSDL -> Sinh câu hỏi Bước 3 linh hoạt
      if (availableCycles.size > 1) {
        const cycleOptions = [];
        if (availableCycles.has('short')) {
          const count = currentPackages.filter(p => (parseInt(p.chu_ky_ngay) || 30) <= 15).length;
          cycleOptions.push({ label: 'Ngắn ngày (<= 15 ngày)', value: 'short', detail: `Gói cước ngắn hạn (${count} gói cước)` });
        }
        if (availableCycles.has('monthly')) {
          const count = currentPackages.filter(p => {
            const d = parseInt(p.chu_ky_ngay) || 30;
            return d > 15 && d <= 90;
          }).length;
          cycleOptions.push({ label: 'Theo Tháng (30 ngày)', value: 'monthly', detail: `Chu kỳ cước phổ thông (${count} gói cước)` });
        }
        if (availableCycles.has('long')) {
          const count = currentPackages.filter(p => (parseInt(p.chu_ky_ngay) || 30) >= 90).length;
          cycleOptions.push({ label: 'Chu kỳ dài (>= 90 ngày)', value: 'long', detail: `Chu kỳ đa tháng / năm (${count} gói cước)` });
        }

        return {
          isCompleted: false,
          currentStepNum: 3,
          totalFixedSteps: 2,
          isDynamicPhase: true,
          nextQuestion: {
            field: 'chu_ky_ngay',
            title: 'Chu Kỳ Sử Dụng Khả Dụng',
            description: 'Lựa chọn thời hạn chu kỳ cước phù hợp từ các gói cước được lọc trong CSDL',
            component: 'single-choice',
            options: cycleOptions
          },
          remainingCount: currentPackages.length,
          answeredFields: ['phan_loai_goi', 'phan_khuc_gia']
        };
      }
    }

    const dynamicNextQuestion = generateNextDynamicQuestion(currentPackages, allFeaturesMap, answeredFields);

    if (!dynamicNextQuestion) {
      const mappedPkgs = currentPackages.map(pkg => mapPackageWithFeatures(pkg));

      return {
        isCompleted: true,
        status: 'EXACT_MATCH',
        message: '✨ Đã hiển thị toàn bộ các gói cước đáp ứng tiêu chí lọc!',
        packages: mappedPkgs,
        nextQuestion: null,
        remainingCount: currentPackages.length,
        currentStepNum: answeredFields.length
      };
    }

    return {
      isCompleted: false,
      currentStepNum: answeredFields.length + 1,
      totalFixedSteps: 2,
      isDynamicPhase: true,
      nextQuestion: dynamicNextQuestion,
      remainingCount: currentPackages.length,
      answeredFields
    };
  },

  submitSurveyAnswers: async (userId, answers, phone = '', fullName = '') => {
    const userObj = userId ? await Account.findOne({ user_id: userId }) : null;
    const result = await surveyService.evaluateState(userObj, answers);

    let surveyHistory = null;
    // Cả Thành viên và Khách vãng lai đều thực hiện lưu khi khảo sát hoàn thành (isCompleted === true)
    if (result.isCompleted) {
      const source = userId ? 'user' : 'guest';
      surveyHistory = await SurveyHistory.create({
        userId: userId || null,
        user_id: userId || null,
        phone: phone || (userObj ? userObj.phone_number : ''),
        full_name: fullName || (userObj ? userObj.name : ''),
        source,
        answers,
        filters: { isCompleted: true, remainingCount: result.remainingCount },
        recommendedPackages: result.packages || [],
        deleted: false,
        deletedAt: null,
        isEarlyTerminated: false
      });
    }

    return {
      ...result,
      surveyHistory
    };
  },

  getSurveyHistory: async (userId) => {
    const history = await SurveyHistory.findOne({ userId, deleted: { $ne: true } }).sort({ createdAt: -1 });
    if (!history) {
      return null;
    }
    return {
      history,
      packages: history.recommendedPackages || []
    };
  },

  deleteSurveyHistory: async (userId) => {
    const result = await SurveyHistory.updateMany(
      { userId, deleted: { $ne: true } },
      {
        $set: {
          deleted: true,
          deletedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  },

  getAllSurveys: async ({ page = 1, limit = 10, search = '' } = {}) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    let mongoQuery = { deleted: { $ne: true } };

    if (search && search.trim()) {
      const searchKeyword = search.trim();
      
      if (/^[0-9+]+$/.test(searchKeyword)) {
        const matchingAccounts = await Account.find({
          phone_number: new RegExp(searchKeyword, 'i')
        }).select('user_id').lean();
        
        const userIds = matchingAccounts.map(acc => acc.user_id);
        mongoQuery.$or = [
          { userId: { $in: userIds } },
          { user_id: { $in: userIds } },
          { phone: new RegExp(searchKeyword, 'i') }
        ];
      } else {
        const matchingAccounts = await Account.find({
          name: new RegExp(searchKeyword, 'i')
        }).select('user_id').lean();
        
        const userIds = matchingAccounts.map(acc => acc.user_id);
        mongoQuery.$or = [
          { userId: { $in: userIds } },
          { user_id: { $in: userIds } },
          { full_name: new RegExp(searchKeyword, 'i') }
        ];
      }
    }

    const total = await SurveyHistory.countDocuments(mongoQuery);

    const rawHistory = await SurveyHistory.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const data = [];
    for (const hist of rawHistory) {
      let phoneNumber = hist.phone || 'Khách vãng lai';
      let fullName = hist.full_name || '';
      let isUser = hist.source === 'user' || !!hist.userId || !!hist.user_id;

      if (hist.userId || hist.user_id) {
        const uid = hist.userId || hist.user_id;
        const user = await Account.findOne({ user_id: uid }).select('phone_number name').lean();
        if (user) {
          phoneNumber = user.phone_number;
          fullName = user.name;
        }
      }

      data.push({
        _id: hist._id,
        userId: hist.userId || hist.user_id || null,
        user_id: hist.user_id || hist.userId || null,
        phoneNumber,
        fullName,
        source: isUser ? 'user' : 'guest',
        answers: hist.answers || {},
        filters: hist.filters || {},
        recommendedPackages: hist.recommendedPackages || [],
        isEarlyTerminated: hist.isEarlyTerminated || false,
        createdAt: hist.createdAt
      });
    }

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  },

  syncPackageFeatures,
  checkAndSeedSurveyConfigs: async () => {
    try {
      await syncPackageFeatures();
    } catch (err) {
      console.error("Auto-sync package features failed:", err);
    }
    console.log("Successfully seeded default Survey Configurations.");
  }
};

SurveyHistory.collection.dropIndex('userId_1').catch(err => {
  // Bỏ qua
});

module.exports = surveyService;
