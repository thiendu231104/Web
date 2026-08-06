const mongoose = require('mongoose');
const Package = require('../models/Package');
const PackageFeature = require('../models/PackageFeature');
const UserActivity = require('../models/UserActivity');
const { canViewPackage } = require('../utils/permission');
const { logUserActivity } = require('../utils/userActivityLogger');

function normalizeNetwork(loaiMangVal) {
  if (!loaiMangVal) return [];
  const parts = loaiMangVal
    .trim()
    .toUpperCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).sort();
}

function compareArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

// Mapping function: Tiếng Việt (DB) -> Tiếng Anh (Frontend)
function mapToEnglish(pkg) {
  if (!pkg) return null;
  const doc = pkg.toObject ? pkg.toObject() : pkg;

  // Trích xuất mã gói cước làm ID string
  const idStr = doc.ma_goi ? doc.ma_goi.toLowerCase() : `pkg_${doc.package_id}`;

  // Trích xuất duration và durationDays
  const durationDays = parseInt(doc.chu_ky_ngay) || 30;
  let duration = 'monthly';
  if (durationDays <= 1) duration = 'daily';
  else if (durationDays <= 15) duration = 'weekly';
  else if (durationDays <= 90) duration = 'monthly';
  else duration = 'yearly';

  // Trích xuất raw data limit GB/day
  let dataPerDayGb = 0;
  if (doc.data_theo_ngay) {
    const match = doc.data_theo_ngay.replace(',', '.').match(/(\d+(\.\d+)?)\s*GB\/ngày/i);
    if (match) {
      dataPerDayGb = parseFloat(match[1]);
    } else {
      const matchTotal = doc.data_theo_ngay.replace(',', '.').match(/(\d+(\.\d+)?)\s*GB/i);
      if (matchTotal) {
        dataPerDayGb = parseFloat(matchTotal[1]) / durationDays;
      }
    }
  }

  // Trích xuất thoại
  let voiceFreeInternalMin = 0;
  let voiceFreeExternalMin = 0;
  if (typeof doc.free_noi_mang === 'number') {
    voiceFreeInternalMin = doc.free_noi_mang;
  } else if (doc.free_noi_mang && doc.free_noi_mang !== '0') {
    const match = String(doc.free_noi_mang).match(/(\d+)/);
    voiceFreeInternalMin = match ? parseInt(match[1]) : 0;
  }
  if (typeof doc.free_ngoai_mang === 'number') {
    voiceFreeExternalMin = doc.free_ngoai_mang;
  } else if (doc.free_ngoai_mang && doc.free_ngoai_mang !== '0') {
    const match = String(doc.free_ngoai_mang).match(/(\d+)/);
    voiceFreeExternalMin = match ? parseInt(match[1]) : 0;
  }

  // Tách các app miễn phí data
  let socialFreeApps = [];
  if (doc.noi_dung_ngoai && doc.noi_dung_ngoai !== '0') {
    socialFreeApps = String(doc.noi_dung_ngoai).split(',').map(s => s.trim()).filter(Boolean);
  } else if (doc.tien_ich_free && doc.tien_ich_free !== '0') {
    socialFreeApps = String(doc.tien_ich_free).split(',').map(s => s.trim()).filter(Boolean);
  }

  // Tách tags
  let tags = [];
  if (doc.dohot === 'Hot') {
    tags.push('Hot');
  }
  if (doc.phan_loai_goi) {
    tags.push(doc.phan_loai_goi);
  }

  // Tạo các giá trị giả lập ổn định cho rating và registrationsCount dựa trên id
  const pkgId = doc.package_id || doc.id || 0;
  const rating = (4.3 + ((pkgId * 7) % 7) / 10).toFixed(1);
  const registrationsCount = 5000 + ((pkgId * 123) % 495000);

  // Terms array
  const terms = [
    'Áp dụng cho thuê bao Viettel di động.',
    doc.dangky ? `Cách đăng ký: ${doc.dangky}` : `Đăng ký: Soạn ${doc.ma_goi} gửi 191`,
    doc.huygiahan ? `Hủy gia hạn: ${doc.huygiahan}` : 'Hủy gia hạn: Soạn HUY gửi 191',
    doc.huygoicuoc ? `Hủy gói: ${doc.huygoicuoc}` : 'Hủy gói cước: Soạn HUYDATA gửi 191'
  ].filter(Boolean);

  // Map category
  let category = 'data';
  const loaiLower = (doc.phan_loai_goi || '').toLowerCase();
  if (loaiLower.includes('combo') || voiceFreeInternalMin > 0) {
    category = 'combo';
  } else if (loaiLower.includes('social') || loaiLower.includes('trí') || socialFreeApps.length > 0) {
    category = 'social';
  } else if (loaiLower.includes('thoại') || loaiLower.includes('voice')) {
    category = 'voice';
  }

  return {
    _id: String(doc._id),
    package_id: doc.package_id,
    id: idStr, // string ID cho frontend
    dbId: doc._id, // lưu MongoDB _id
    numericId: doc.package_id || doc.id, // lưu id số gốc
    is_auto_renew: doc.is_auto_renew !== undefined ? doc.is_auto_renew : true,
    ma_goi: doc.ma_goi,
    name: doc.ten,
    ten: doc.ten,
    price: doc.gia,
    gia: doc.gia,
    duration,
    durationDays,
    chu_ky_ngay: durationDays,
    dataLimit: doc.data_theo_ngay || '0 GB',
    data_theo_ngay: doc.data_theo_ngay || '',
    data_meta: doc.data_meta || null,
    dataPerDayGb: parseFloat(dataPerDayGb.toFixed(2)),
    voiceFreeInternalMin,
    voiceFreeExternalMin,
    free_noi_mang: typeof doc.free_noi_mang === 'number' ? doc.free_noi_mang : (parseInt(doc.free_noi_mang) || 0),
    free_ngoai_mang: typeof doc.free_ngoai_mang === 'number' ? doc.free_ngoai_mang : (parseInt(doc.free_ngoai_mang) || 0),
    sms: typeof doc.sms === 'number' ? doc.sms : (parseInt(doc.sms) || 0),
    socialFreeApps,
    description: doc.uudaitrong || doc.ten,
    uudaitrong: doc.uudaitrong || '',
    terms,
    conditions: doc.doi_tuong_ap_dung || 'Dành cho tất cả thuê bao di động Viettel.',
    doi_tuong_ap_dung: doc.doi_tuong_ap_dung || '',
    isPopular: doc.dohot === 'Hot',
    dohot: doc.dohot || 'normal',
    phan_loai_goi: doc.phan_loai_goi || 'Data',
    category,
    rating: parseFloat(rating),
    registrationsCount,
    tags,
    tien_ich_free: doc.tien_ich_free || null,
    noi_dung_ngoai: doc.noi_dung_ngoai || null,
    dangky: doc.dangky || null,
    huygiahan: doc.huygiahan || null,
    huygoicuoc: doc.huygoicuoc || null,
    service_group: doc.service_group || 'daily_data',
    registration_policy: doc.registration_policy || 'ALLOW',
    allow_parallel_with: doc.allow_parallel_with || [],
    system_type: doc.system_type || 'DATA_BASE',
    is_addon: doc.is_addon || false,
    requires_base_package: doc.requires_base_package || false,
    benefit_group: doc.benefit_group || 'DATA_MAIN'
  };
}

// Mapping function: Tiếng Anh (Frontend) -> Tiếng Việt (DB)
function mapToVietnamese(englishData) {
  const ma_goi = englishData.ma_goi || (englishData.name ? englishData.name.split('-')[0].trim().toUpperCase() : 'NEW_PKG');

  // Sanitize phan_loai_goi: Chỉ chấp nhận 'Data' hoặc 'Combo'
  let phan_loai_goi = englishData.phan_loai_goi || 'Data';
  if (englishData.category === 'combo') phan_loai_goi = 'Combo';
  if (!['Data', 'Combo'].includes(phan_loai_goi)) {
    phan_loai_goi = 'Data';
  }

  // Sanitize benefit_group: Chuẩn hóa FACEBOOK -> APP_META
  let benefit_group = englishData.benefit_group || 'DATA_MAIN';
  if (benefit_group === 'FACEBOOK') {
    benefit_group = 'APP_META';
  }

  // Sanitize service_group: Chuẩn hóa daily_data -> DATA
  let service_group = englishData.service_group || 'DATA';
  if (service_group === 'daily_data') {
    service_group = 'DATA';
  }

  // Xác định cycle_type từ chu_ky_ngay nếu không được cung cấp
  const chu_ky_ngay = parseInt(englishData.chu_ky_ngay || englishData.durationDays) || 30;
  let cycle_type = englishData.cycle_type || 'MONTH';
  if (!englishData.cycle_type) {
    if (chu_ky_ngay >= 365) cycle_type = 'YEAR';
    else if (chu_ky_ngay >= 28) cycle_type = 'MONTH';
    else cycle_type = 'DAY';
  }

  return {
    ma_goi,
    ten: englishData.ten || englishData.name,
    dohot: englishData.isPopular ? 'Hot' : (englishData.dohot || 'normal'),
    phan_loai_goi,
    gia: parseInt(englishData.price || englishData.gia) || 0,
    chu_ky_ngay,
    cycle_type,
    data_theo_ngay: englishData.data_theo_ngay || englishData.dataLimit || '',
    data_meta: englishData.data_meta || null,
    free_noi_mang: typeof englishData.free_noi_mang === 'number' ? englishData.free_noi_mang : (parseInt(englishData.voiceFreeInternalMin) || 0),
    free_ngoai_mang: typeof englishData.free_ngoai_mang === 'number' ? englishData.free_ngoai_mang : (parseInt(englishData.voiceFreeExternalMin) || 0),
    sms: typeof englishData.sms === 'number' ? englishData.sms : (parseInt(englishData.sms) || 0),
    doi_tuong_ap_dung: englishData.doi_tuong_ap_dung || englishData.conditions || '',
    noi_dung_ngoai: englishData.noi_dung_ngoai || null,
    tien_ich_free: englishData.tien_ich_free || null,
    uudaitrong: englishData.uudaitrong || englishData.description || '',
    dangky: englishData.dangky || null,
    huygiahan: englishData.huygiahan || null,
    huygoicuoc: englishData.huygoicuoc || null,
    is_auto_renew: englishData.is_auto_renew !== undefined ? englishData.is_auto_renew : true,
    service_group,
    registration_policy: englishData.registration_policy || 'ALLOW',
    allow_parallel_with: Array.isArray(englishData.allow_parallel_with) ? englishData.allow_parallel_with : [],
    system_type: englishData.system_type || 'DATA_BASE',
    is_addon: Boolean(englishData.is_addon),
    requires_base_package: Boolean(englishData.requires_base_package),
    benefit_group
  };
}

// Helper to extract feature flags from body or auto-calculate defaults
function extractPackageFeatures(pkgDoc, body = {}) {
  const dataStr = body.data_theo_ngay || pkgDoc.data_theo_ngay || '';
  const hasDataCalc = Boolean(dataStr && dataStr.trim() !== '' && dataStr !== '0');
  const freeNoi = typeof body.free_noi_mang === 'number' ? body.free_noi_mang : (pkgDoc.free_noi_mang || 0);
  const freeNgoai = typeof body.free_ngoai_mang === 'number' ? body.free_ngoai_mang : (pkgDoc.free_ngoai_mang || 0);
  const hasVoiceCalc = freeNoi > 0 || freeNgoai > 0;
  const smsVal = typeof body.sms === 'number' ? body.sms : (pkgDoc.sms || 0);
  const hasSmsCalc = smsVal > 0;

  const tienIchStr = [
    body.tien_ich_free || pkgDoc.tien_ich_free || '',
    body.noi_dung_ngoai || pkgDoc.noi_dung_ngoai || ''
  ].join(' ');

  // Auto-compute price_level
  const giaVal = parseInt(body.gia || body.price || pkgDoc.gia) || 0;
  let autoPrice = 'medium';
  if (giaVal < 50000) autoPrice = 'cheap';
  else if (giaVal > 200000) autoPrice = 'expensive';

  // Auto-compute searchable_tags (bao gồm tất cả thông tin phục vụ AI tìm kiếm)
  let autoTags;
  if (Array.isArray(body.searchable_tags) && body.searchable_tags.length > 0) {
    autoTags = body.searchable_tags;
  } else {
    const tagSet = new Set();
    if (pkgDoc.ma_goi) tagSet.add(pkgDoc.ma_goi);
    if (pkgDoc.ten) tagSet.add(pkgDoc.ten);
    if (pkgDoc.phan_loai_goi) tagSet.add(pkgDoc.phan_loai_goi);
    if (pkgDoc.benefit_group) tagSet.add(pkgDoc.benefit_group);
    if (pkgDoc.system_type) tagSet.add(pkgDoc.system_type);
    if (pkgDoc.dohot === 'Hot') tagSet.add('Hot');
    // Phân tích tien_ich_free để thêm tag ứng dụng
    const tienIch = body.tien_ich_free || pkgDoc.tien_ich_free || '';
    tienIch.split(',').forEach(s => {
      const t = s.trim();
      if (t && t !== '0') tagSet.add(t);
    });
    autoTags = Array.from(tagSet);
  }

  return {
    package_id: pkgDoc.package_id,
    ma_goi: pkgDoc.ma_goi,
    has_5g: body.has_5g !== undefined ? Boolean(body.has_5g) : false,
    has_data: body.has_data !== undefined ? Boolean(body.has_data) : hasDataCalc,
    has_voice: body.has_voice !== undefined ? Boolean(body.has_voice) : hasVoiceCalc,
    has_sms: body.has_sms !== undefined ? Boolean(body.has_sms) : hasSmsCalc,
    has_facebook: body.has_facebook !== undefined ? Boolean(body.has_facebook) : /facebook|messenger/i.test(tienIchStr),
    has_youtube: body.has_youtube !== undefined ? Boolean(body.has_youtube) : /youtube/i.test(tienIchStr),
    has_tiktok: body.has_tiktok !== undefined ? Boolean(body.has_tiktok) : /tiktok/i.test(tienIchStr),
    has_tv360: body.has_tv360 !== undefined ? Boolean(body.has_tv360) : /tv360/i.test(tienIchStr),
    has_movie: body.has_movie !== undefined ? Boolean(body.has_movie) : /phim|movie|cinema/i.test(tienIchStr),
    has_social: body.has_social !== undefined ? Boolean(body.has_social) : (pkgDoc.phan_loai_goi === 'Social' || /mxh|mạng xã hội|social/i.test(tienIchStr)),
    is_combo: body.is_combo !== undefined ? Boolean(body.is_combo) : (pkgDoc.phan_loai_goi === 'Combo' || (hasDataCalc && hasVoiceCalc)),
    is_data_only: body.is_data_only !== undefined ? Boolean(body.is_data_only) : (pkgDoc.phan_loai_goi === 'Data' && !hasVoiceCalc),
    is_social: body.is_social !== undefined ? Boolean(body.is_social) : (pkgDoc.phan_loai_goi === 'Social'),
    is_addon: body.is_addon !== undefined ? Boolean(body.is_addon) : Boolean(pkgDoc.is_addon),
    cycle_days: parseInt(body.cycle_days || body.chu_ky_ngay || pkgDoc.chu_ky_ngay) || 30,
    price: giaVal,
    price_level: body.price_level || autoPrice,
    data_level: body.data_level || (hasDataCalc ? 'medium' : 'none'),
    voice_level: body.voice_level || (hasVoiceCalc ? 'medium' : 'none'),
    sms_level: body.sms_level || (hasSmsCalc ? 'low' : 'none'),
    searchable_tags: autoTags
  };
}

// 1. GET /packages - Get list of packages with pagination, search, filters, sorting
exports.getPackages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;

    const mongoQuery = {};

    // A. Keyword Search (ma_goi, ten, uudaitrong)
    const searchVal = req.query.search || req.query.q;
    if (searchVal && searchVal.trim()) {
      const keyword = searchVal.trim();
      mongoQuery.$or = [
        { ma_goi: { $regex: keyword, $options: 'i' } },
        { ten: { $regex: keyword, $options: 'i' } },
        { uudaitrong: { $regex: keyword, $options: 'i' } }
      ];
    }

    // B. Category Filter (phan_loai_goi)
    if (req.query.category && req.query.category !== 'all') {
      const cat = req.query.category.toLowerCase();
      if (cat === 'data') {
        mongoQuery.phan_loai_goi = 'Data';
      } else if (cat === 'combo') {
        mongoQuery.phan_loai_goi = 'Combo';
      } else if (cat === 'social') {
        mongoQuery.phan_loai_goi = 'Social';
      } else if (cat === 'voice') {
        mongoQuery.phan_loai_goi = { $in: ['Combo', 'Thoại'] };
      } else {
        mongoQuery.phan_loai_goi = new RegExp(`^${cat}$`, 'i');
      }
    }

    // C. Price Filter
    if (req.query.price && req.query.price !== 'all') {
      const priceOpt = req.query.price;
      if (priceOpt === 'Gia_re' || priceOpt === 'under_50') {
        mongoQuery.gia = { $lt: 50000 };
      } else if (priceOpt === 'Trung_binh') {
        mongoQuery.gia = { $gte: 50000, $lte: 150000 };
      } else if (priceOpt === 'Cao_cap') {
        mongoQuery.gia = { $gt: 150000 };
      } else if (priceOpt === '50_100') {
        mongoQuery.gia = { $gte: 50000, $lte: 100000 };
      } else if (priceOpt === '100_200') {
        mongoQuery.gia = { $gt: 100000, $lte: 200000 };
      } else if (priceOpt === 'above_200') {
        mongoQuery.gia = { $gt: 200000 };
      }
    }

    // D. Cycle Filter
    const cycleOpt = req.query.cycle || req.query.duration;
    if (cycleOpt && cycleOpt !== 'all') {
      if (/^\d+$/.test(cycleOpt)) {
        mongoQuery.chu_ky_ngay = parseInt(cycleOpt);
      } else if (cycleOpt === 'daily') {
        mongoQuery.chu_ky_ngay = { $lte: 1 };
      } else if (cycleOpt === 'weekly') {
        mongoQuery.chu_ky_ngay = { $gt: 1, $lte: 15 };
      } else if (cycleOpt === 'monthly') {
        mongoQuery.chu_ky_ngay = { $gt: 15, $lte: 90 };
      } else if (cycleOpt === 'yearly') {
        mongoQuery.chu_ky_ngay = { $gt: 90 };
      }
    }

    // E. Data Filter
    if (req.query.data && req.query.data !== 'all') {
      if (req.query.data === 'yes' || req.query.data === 'true') {
        mongoQuery.data_theo_ngay = { $ne: '0', $exists: true };
      } else if (req.query.data === 'no' || req.query.data === 'false') {
        mongoQuery.$or = [
          { data_theo_ngay: '0' },
          { data_theo_ngay: '' },
          { data_theo_ngay: null }
        ];
      }
    }

    // F. Call Filter
    if (req.query.call && req.query.call !== 'all') {
      if (req.query.call === 'yes' || req.query.call === 'true') {
        mongoQuery.$or = [
          { free_noi_mang: { $gt: 0 } },
          { free_ngoai_mang: { $gt: 0 } }
        ];
      } else if (req.query.call === 'no' || req.query.call === 'false') {
        mongoQuery.free_noi_mang = 0;
        mongoQuery.free_ngoai_mang = 0;
      }
    }

    // G. SMS Filter
    if (req.query.sms && req.query.sms !== 'all') {
      if (req.query.sms === 'yes' || req.query.sms === 'true') {
        mongoQuery.sms = { $gt: 0 };
      } else if (req.query.sms === 'no' || req.query.sms === 'false') {
        mongoQuery.sms = 0;
      }
    }

    // H. Hot Filter
    if (req.query.hot && req.query.hot !== 'all') {
      if (req.query.hot === 'yes' || req.query.hot === 'true') {
        mongoQuery.dohot = 'Hot';
      } else if (req.query.hot === 'no' || req.query.hot === 'false') {
        mongoQuery.dohot = { $ne: 'Hot' };
      }
    }

    // Pipeline
    const pipeline = [
      { $match: mongoQuery },
      {
        $addFields: {
          rating: { $add: [4.2, { $divide: [{ $mod: ["$package_id", 8] }, 10] }] },
          registrationsCount: { $add: [2000, { $mod: [{ $multiply: ["$package_id", 456] }, 250000] }] }
        }
      }
    ];

    const sortOpt = req.query.sort || 'popular';
    const normalizedSort = sortOpt.toLowerCase().trim();

    if (normalizedSort === 'price_asc' || normalizedSort === 'price asc') {
      pipeline.push({ $sort: { gia: 1, package_id: 1 } });
    } else if (normalizedSort === 'price_desc' || normalizedSort === 'price desc') {
      pipeline.push({ $sort: { gia: -1, package_id: 1 } });
    } else if (normalizedSort === 'name' || normalizedSort === 'name asc') {
      pipeline.push({ $sort: { ten: 1, package_id: 1 } });
    } else if (normalizedSort === 'newest') {
      pipeline.push({ $sort: { createdAt: -1, package_id: -1 } });
    } else if (normalizedSort === 'recommended') {
      pipeline.push({ $sort: { rating: -1, package_id: 1 } });
    } else {
      pipeline.push({ $sort: { registrationsCount: -1, package_id: 1 } });
    }

    const resultRaw = await Package.aggregate(pipeline);
    let packagesMapped = resultRaw.map(pkg => mapToEnglish(pkg));

    // Permission filter
    let filteredPackages = packagesMapped.filter(pkg => canViewPackage(req.user, pkg));

    // Fetch and merge features from package_features (Single Source of Truth)
    const packageIds = filteredPackages.map(p => p.numericId);
    const features = await PackageFeature.find({ package_id: { $in: packageIds } });
    const featuresMap = new Map();
    features.forEach(f => {
      featuresMap.set(f.package_id, f);
    });

    filteredPackages = filteredPackages.map(pkg => {
      const feat = featuresMap.get(pkg.numericId) || {};
      return {
        ...pkg,
        has_5g: feat.has_5g !== undefined ? feat.has_5g : false,
        has_data: feat.has_data !== undefined ? feat.has_data : (Boolean(pkg.data_theo_ngay) && pkg.data_theo_ngay !== '0'),
        has_voice: feat.has_voice !== undefined ? feat.has_voice : (pkg.free_noi_mang > 0 || pkg.free_ngoai_mang > 0),
        has_sms: feat.has_sms !== undefined ? feat.has_sms : (pkg.sms > 0),
        has_youtube: feat.has_youtube !== undefined ? feat.has_youtube : false,
        has_tiktok: feat.has_tiktok !== undefined ? feat.has_tiktok : false,
        has_facebook: feat.has_facebook !== undefined ? feat.has_facebook : false,
        has_tv360: feat.has_tv360 !== undefined ? feat.has_tv360 : false,
        has_movie: feat.has_movie !== undefined ? feat.has_movie : false,
        has_social: feat.has_social !== undefined ? feat.has_social : false,
        is_combo: feat.is_combo !== undefined ? feat.is_combo : (pkg.phan_loai_goi === 'Combo'),
        is_data_only: feat.is_data_only !== undefined ? feat.is_data_only : (pkg.phan_loai_goi === 'Data'),
        is_social: feat.is_social !== undefined ? feat.is_social : (pkg.phan_loai_goi === 'Social'),
        is_addon: feat.is_addon !== undefined ? feat.is_addon : Boolean(pkg.is_addon),
        price_level: feat.price_level || 'medium',
        data_level: feat.data_level || 'medium',
        voice_level: feat.voice_level || 'none',
        sms_level: feat.sms_level || 'none',
        cycle_days: feat.cycle_days || pkg.chu_ky_ngay || 30,
        price: feat.price || pkg.gia || 0
      };
    });

    // In-memory Network Filter
    const netOpt = req.query.network || req.query.loai_mang;
    if (netOpt && netOpt !== 'all' && netOpt !== '') {
      const netLower = netOpt.toLowerCase();
      filteredPackages = filteredPackages.filter(pkg => {
        const normalized = normalizeNetwork(pkg.loai_mang);
        if (netLower === '4g') {
          return normalized.includes('4G');
        } else if (netLower === '5g') {
          return normalized.includes('5G') || pkg.has_5g;
        } else if (netLower === 'both' || netLower === '4g,5g' || netLower === '5g,4g') {
          return normalized.includes('4G') && normalized.includes('5G');
        }
        return true;
      });
    }

    const total = filteredPackages.length;
    const paginatedPackages = filteredPackages.slice(skip, skip + limit);

    res.json({
      packages: paginatedPackages,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    console.error("Error in getPackages API:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tải danh sách gói cước." });
  }
};

// 2. GET /packages/search - Fast keyword search
exports.searchPackages = async (req, res) => {
  try {
    const keyword = req.query.q || '';
    if (!keyword.trim()) {
      return res.json([]);
    }

    const searchRegex = new RegExp(keyword, 'i');
    const matches = await Package.find({
      $or: [
        { ten: searchRegex },
        { ma_goi: searchRegex },
        { uudaitrong: searchRegex }
      ]
    }).limit(10);

    const mapped = matches.map(m => mapToEnglish(m));
    const filtered = mapped.filter(p => canViewPackage(req.user, p));
    res.json(filtered);
  } catch (error) {
    console.error("Error in searchPackages API:", error);
    res.status(500).json({ success: false, message: "Lỗi tìm kiếm." });
  }
};

// 3. GET /packages/filter - Dynamic filter options from DB
exports.getFilterOptions = async (req, res) => {
  try {
    const phanLoaiValues = await Package.distinct('phan_loai_goi');
    const categoriesMap = new Map();
    phanLoaiValues.forEach(v => {
      if (!v) return;
      const lower = v.toLowerCase();
      if (lower === 'data') {
        categoriesMap.set('data', { key: 'data', label: 'Data' });
      } else if (lower === 'combo') {
        categoriesMap.set('combo', { key: 'combo', label: 'Combo' });
      } else if (lower === 'mxh' || lower === 'social') {
        categoriesMap.set('social', { key: 'social', label: 'Mạng xã hội' });
      } else {
        categoriesMap.set(lower, { key: lower, label: v });
      }
    });
    const categories = Array.from(categoriesMap.values());

    const loaiValues = await Package.distinct('loai');
    const networks = loaiValues.filter(Boolean).map(v => v.trim());

    const cycleValues = await Package.distinct('chu_ky_ngay');
    const durations = cycleValues
      .filter(Boolean)
      .map(v => parseInt(v))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b)
      .map(days => ({
        key: String(days),
        label: `${days} ngày`
      }));

    const distinctTienIch = await Package.distinct('tien_ich_free');
    const combined = new Set();
    distinctTienIch.forEach(val => {
      if (!val || val === '0') return;
      val.split(',').forEach(item => {
        const trimmed = item.trim();
        if (!trimmed || trimmed === '0' || trimmed.toLowerCase().includes('gb')) return;
        combined.add(trimmed);
      });
    });

    const appPromos = [...combined].sort((a, b) => a.localeCompare(b));

    res.json({
      categories,
      networks: networks.length > 0 ? networks : ['4G/5G', '5G', '4G'],
      durations,
      appPromos
    });
  } catch (error) {
    console.error("Error in getFilterOptions API:", error);
    res.status(500).json({ success: false, message: "Lỗi tải cấu hình bộ lọc." });
  }
};

// 4. GET /packages/categories
exports.getCategories = async (req, res) => {
  try {
    res.json([
      { id: 'data', name: 'Chỉ DATA', count: await Package.countDocuments({ phan_loai_goi: 'Data' }) },
      { id: 'combo', name: 'Combo Thoại + Data', count: await Package.countDocuments({ phan_loai_goi: 'Combo' }) },
      { id: 'social', name: 'Mạng xã hội', count: await Package.countDocuments({ phan_loai_goi: 'Social' }) }
    ]);
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi tải categories." });
  }
};

// 5. GET /packages/providers
exports.getProviders = (req, res) => {
  res.json(['Viettel']);
};

// 6. GET /packages/:id - Get detail package merged with PackageFeature
exports.getPackageById = async (req, res) => {
  try {
    const idParam = req.params.id;

    let pkg = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      pkg = await Package.findById(idParam);
    }

    if (!pkg) {
      let numericId = -1;
      if (idParam.startsWith('pkg_')) {
        const parsed = parseInt(idParam.replace('pkg_', ''));
        if (!isNaN(parsed)) numericId = parsed;
      } else if (!isNaN(idParam)) {
        numericId = parseInt(idParam);
      }

      pkg = await Package.findOne({
        $or: [
          { ma_goi: new RegExp(`^${idParam}$`, 'i') },
          { package_id: numericId }
        ]
      });
    }

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Không tìm thấy gói cước." });
    }

    const mapped = mapToEnglish(pkg);
    if (!canViewPackage(req.user, mapped)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xem gói cước này." });
    }

    const feat = await PackageFeature.findOne({ package_id: mapped.numericId });
    if (feat) {
      mapped.has_5g = feat.has_5g !== undefined ? feat.has_5g : false;
      mapped.has_data = feat.has_data !== undefined ? feat.has_data : false;
      mapped.has_voice = feat.has_voice !== undefined ? feat.has_voice : false;
      mapped.has_sms = feat.has_sms !== undefined ? feat.has_sms : false;
      mapped.has_youtube = feat.has_youtube !== undefined ? feat.has_youtube : false;
      mapped.has_tiktok = feat.has_tiktok !== undefined ? feat.has_tiktok : false;
      mapped.has_facebook = feat.has_facebook !== undefined ? feat.has_facebook : false;
      mapped.has_tv360 = feat.has_tv360 !== undefined ? feat.has_tv360 : false;
      mapped.has_movie = feat.has_movie !== undefined ? feat.has_movie : false;
      mapped.has_social = feat.has_social !== undefined ? feat.has_social : false;
      mapped.is_combo = feat.is_combo !== undefined ? feat.is_combo : false;
      mapped.is_data_only = feat.is_data_only !== undefined ? feat.is_data_only : false;
      mapped.is_social = feat.is_social !== undefined ? feat.is_social : false;
      mapped.is_addon = feat.is_addon !== undefined ? feat.is_addon : false;
      mapped.price_level = feat.price_level || 'medium';
      mapped.data_level = feat.data_level || 'medium';
      mapped.voice_level = feat.voice_level || 'none';
      mapped.sms_level = feat.sms_level || 'none';
      mapped.cycle_days = feat.cycle_days || mapped.chu_ky_ngay || 30;
      mapped.price = feat.price || mapped.gia || 0;
    }

    // Logic điều hướng ghi log duy nhất (Phòng chống duplicate log)
    const searchKeyword = req.query.search_keyword || req.query.searchKeyword;
    if (searchKeyword && String(searchKeyword).trim() !== '') {
      // Luồng 1: Tìm kiếm -> Xem chi tiết (SEARCH_VIEW)
      await logUserActivity({
        req,
        actionType: 'SEARCH',
        flowType: 'SEARCH_VIEW',
        source: 'search',
        packageId: mapped.numericId,
        searchKeyword: String(searchKeyword).trim()
      });
    } else {
      // Luồng Mặc định: Chỉ xem chi tiết (VIEW_ONLY)
      await logUserActivity({
        req,
        actionType: 'VIEW_PACKAGE',
        flowType: 'VIEW_ONLY',
        source: 'detail',
        packageId: mapped.numericId,
        searchKeyword: null
      });
    }

    res.json(mapped);
  } catch (error) {
    console.error("Error in getPackageById API:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy chi tiết gói cước." });
  }
};

// 6b. GET /packages/recently-viewed - Fetch 4 distinct recently viewed/interacted packages for Home page
exports.getRecentlyViewedPackages = async (req, res) => {
  try {
    const userId = req.user ? (req.user.user_id ?? req.user.id ?? null) : null;
    const sessionId = req.headers['x-session-id'] || req.headers['session-id'] || req.cookies?.sessionId || req.query?.session_id;

    let queryFilter = null;
    if (userId !== null && userId !== undefined) {
      queryFilter = { user_id: Number(userId) };
    } else if (sessionId) {
      queryFilter = { session_id: String(sessionId).trim(), user_id: null };
    }

    if (!queryFilter) {
      return res.json({ success: true, packages: [] });
    }

    queryFilter.action_type = { $in: ['VIEW_PACKAGE', 'SEARCH', 'COMPARE', 'SUBSCRIBE', 'COMPARE_AND_SUBSCRIBE'] };

    const activities = await UserActivity.find(queryFilter)
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    const seenPackageIds = new Set();
    const orderedPackageIds = [];

    for (const act of activities) {
      if (act.package_id && !seenPackageIds.has(act.package_id)) {
        seenPackageIds.add(act.package_id);
        orderedPackageIds.push(act.package_id);
        if (orderedPackageIds.length >= 4) break;
      }
    }

    if (orderedPackageIds.length === 0) {
      return res.json({ success: true, packages: [] });
    }

    const rawPackages = await Package.find({ package_id: { $in: orderedPackageIds } });
    const features = await PackageFeature.find({ package_id: { $in: orderedPackageIds } });
    const featuresMap = new Map();
    features.forEach(f => featuresMap.set(f.package_id, f));

    const mappedMap = new Map();
    rawPackages.forEach(pkg => {
      const mapped = mapToEnglish(pkg);
      if (canViewPackage(req.user, mapped)) {
        const feat = featuresMap.get(mapped.numericId) || {};
        const merged = {
          ...mapped,
          has_5g: feat.has_5g !== undefined ? feat.has_5g : false,
          has_data: feat.has_data !== undefined ? feat.has_data : (Boolean(mapped.data_theo_ngay) && mapped.data_theo_ngay !== '0'),
          has_voice: feat.has_voice !== undefined ? feat.has_voice : (mapped.free_noi_mang > 0 || mapped.free_ngoai_mang > 0),
          has_sms: feat.has_sms !== undefined ? feat.has_sms : (mapped.sms > 0),
          has_youtube: feat.has_youtube !== undefined ? feat.has_youtube : false,
          has_tiktok: feat.has_tiktok !== undefined ? feat.has_tiktok : false,
          has_facebook: feat.has_facebook !== undefined ? feat.has_facebook : false,
          has_tv360: feat.has_tv360 !== undefined ? feat.has_tv360 : false,
          has_movie: feat.has_movie !== undefined ? feat.has_movie : false,
          has_social: feat.has_social !== undefined ? feat.has_social : false,
          is_combo: feat.is_combo !== undefined ? feat.is_combo : (mapped.phan_loai_goi === 'Combo'),
          is_data_only: feat.is_data_only !== undefined ? feat.is_data_only : (mapped.phan_loai_goi === 'Data'),
          is_social: feat.is_social !== undefined ? feat.is_social : (mapped.phan_loai_goi === 'Social'),
          is_addon: feat.is_addon !== undefined ? feat.is_addon : Boolean(mapped.is_addon),
          price_level: feat.price_level || 'medium',
          data_level: feat.data_level || 'medium',
          voice_level: feat.voice_level || 'none',
          sms_level: feat.sms_level || 'none',
          cycle_days: feat.cycle_days || mapped.chu_ky_ngay || 30,
          price: feat.price || mapped.gia || 0
        };
        mappedMap.set(mapped.numericId, merged);
      }
    });

    const finalPackages = [];
    for (const pkgId of orderedPackageIds) {
      if (mappedMap.has(pkgId)) {
        finalPackages.push(mappedMap.get(pkgId));
      }
    }

    res.json({ success: true, packages: finalPackages });
  } catch (error) {
    console.error("Error in getRecentlyViewedPackages API:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách gói cước vừa xem." });
  }
};

// 7. POST /packages - Create package dual-saved in goi_cuoc and package_features
exports.createPackage = async (req, res) => {
  try {
    const reqBody = req.body;

    const name = reqBody.ten || reqBody.name;
    const price = reqBody.gia !== undefined ? reqBody.gia : reqBody.price;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: "Tên gói cước và giá cước là bắt buộc." });
    }

    // Step 1: Find next numeric id
    const lastPkg = await Package.findOne().sort({ package_id: -1 });
    const nextId = lastPkg ? lastPkg.package_id + 1 : 1;

    // Step 2: Separate and map data for goi_cuoc
    const vnData = mapToVietnamese(reqBody);
    vnData.package_id = nextId;

    const existing = await Package.findOne({ ma_goi: vnData.ma_goi });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã gói cước ${vnData.ma_goi} đã tồn tại.` });
    }

    // Step 3: Save to goi_cuoc
    const createdPkg = await Package.create(vnData);
    console.log(`[Admin] Created package in goi_cuoc: ${createdPkg.ma_goi} (ID: ${createdPkg.package_id})`);

    // Step 4: Extract and upsert into package_features
    const featureData = extractPackageFeatures(createdPkg, reqBody);
    const createdFeature = await PackageFeature.findOneAndUpdate(
      { package_id: createdPkg.package_id },
      featureData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[Admin] Synchronized package_features for ID: ${createdPkg.package_id}`);

    // Return complete merged object
    const resultObj = {
      ...mapToEnglish(createdPkg),
      ...createdFeature.toObject()
    };

    res.status(201).json({
      success: true,
      message: "Tạo gói cước và đồng bộ cơ sở dữ liệu thành công!",
      package: resultObj
    });
  } catch (error) {
    console.error("Error in createPackage API:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tạo gói cước." });
  }
};

// 8. PUT /packages/:id - Update package dual-saved in goi_cuoc and package_features
exports.updatePackage = async (req, res) => {
  try {
    const idParam = req.params.id;
    const reqBody = req.body;

    let pkg = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      pkg = await Package.findById(idParam);
    }

    if (!pkg) {
      let numericId = -1;
      if (idParam.startsWith('pkg_')) {
        const parsed = parseInt(idParam.replace('pkg_', ''));
        if (!isNaN(parsed)) numericId = parsed;
      } else if (!isNaN(idParam)) {
        numericId = parseInt(idParam);
      }

      pkg = await Package.findOne({
        $or: [
          { ma_goi: new RegExp(`^${idParam}$`, 'i') },
          { package_id: numericId }
        ]
      });
    }

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Không tìm thấy gói cước để cập nhật." });
    }

    // Step 1: Map data for goi_cuoc
    const vnData = mapToVietnamese(reqBody);

    // Step 2: Update goi_cuoc
    const updatedPkg = await Package.findByIdAndUpdate(pkg._id, vnData, { returnDocument: 'after' });
    console.log(`[Admin] Updated package in goi_cuoc: ${updatedPkg.ma_goi}`);

    // Step 3: Extract and upsert package_features
    const featureData = extractPackageFeatures(updatedPkg, reqBody);
    const updatedFeature = await PackageFeature.findOneAndUpdate(
      { package_id: updatedPkg.package_id },
      featureData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[Admin] Synchronized package_features for ID: ${updatedPkg.package_id}`);

    // Return complete merged object
    const resultObj = {
      ...mapToEnglish(updatedPkg),
      ...updatedFeature.toObject()
    };

    res.json({
      success: true,
      message: "Cập nhật gói cước và đồng bộ cơ sở dữ liệu thành công!",
      package: resultObj
    });
  } catch (error) {
    console.error("Error in updatePackage API:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi cập nhật gói cước." });
  }
};

// 9. DELETE /packages/:id - Delete package in both goi_cuoc and package_features
exports.deletePackage = async (req, res) => {
  try {
    const idParam = req.params.id;

    let pkg = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      pkg = await Package.findById(idParam);
    }
    if (!pkg) {
      let numericId = -1;
      if (idParam.startsWith('pkg_')) {
        const parsed = parseInt(idParam.replace('pkg_', ''));
        if (!isNaN(parsed)) numericId = parsed;
      } else if (!isNaN(idParam)) {
        numericId = parseInt(idParam);
      }

      pkg = await Package.findOne({
        $or: [
          { ma_goi: new RegExp(`^${idParam}$`, 'i') },
          { package_id: numericId }
        ]
      });
    }

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Không tìm thấy gói cước để xóa." });
    }

    const pkgId = pkg.package_id;
    await Package.findByIdAndDelete(pkg._id);
    await PackageFeature.deleteOne({ package_id: pkgId });
    console.log(`[Admin] Deleted package ${pkg.ma_goi} from goi_cuoc & package_features`);

    res.json({
      success: true,
      message: `Đã xóa thành công gói cước ${pkg.ma_goi} từ cả 2 bảng cơ sở dữ liệu.`
    });
  } catch (error) {
    console.error("Error in deletePackage API:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa gói cước." });
  }
};

exports.mapToEnglish = mapToEnglish;

