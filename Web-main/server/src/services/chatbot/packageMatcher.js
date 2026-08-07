/**
 * packageMatcher.js — Pure RAG Retrieval Engine (Step 3)
 *
 * Chức năng:
 * - Tiếp nhận NLU Intent từ Pass 1.
 * - ĐIỀU KIỆN ƯU TIÊN TUYỆT ĐỐI (DIRECT TARGET MATCHING): Khi target_package != null, chỉ query CSDL để lấy ĐÚNG 1 GÓI CƯỚC có mã bằng target_package. NẾU KHÔNG TÌM THẤY: Trả về mảng rỗng [] (Tuyệt đối KHÔNG fallback vớt các gói khác).
 * - Truy vấn MongoDB lấy Top 3 - 5 gói cước liên quan nhất dựa trên:
 *   1. Loại nhu cầu: Combo hay Data hay App
 *   2. Chu kỳ: Ngày / Tuần / Tháng / Năm
 *   3. Giá tiền: Ưu tiên gói sát với budget_max nhất (hoặc gói rẻ nhất cùng loại nếu vượt ngân sách)
 */

const Package = require('../../models/Package');
const PackageFeature = require('../../models/PackageFeature');

/**
 * Chuẩn hoá một gói cước từ Mongoose document thành plain object
 */
function normalizePackage(pkg) {
  if (!pkg) return {};
  const raw = typeof pkg.toObject === 'function' ? pkg.toObject() : pkg;
  const days = raw?.chu_ky_ngay != null ? Number(raw.chu_ky_ngay) : 30;
  return {
    id: raw?.package_id ? String(raw.package_id) : (raw?._id ? String(raw._id) : ''),
    numericId: raw?.package_id ? Number(raw.package_id) : undefined,
    package_id: raw?.package_id,
    ma_goi: raw?.ma_goi || '',
    ten: raw?.ten || '',
    gia: raw?.gia != null ? Number(raw.gia) : 0,
    chu_ky_ngay: days,
    cycle_type: raw?.cycle_type || (days >= 30 ? 'MONTH' : 'DAY'),
    dohot: raw?.dohot || 'normal',
    phan_loai_goi: raw?.phan_loai_goi || 'Data',
    data_theo_ngay: raw?.data_theo_ngay || '',
    data_meta: raw?.data_meta || null,
    free_noi_mang: raw?.free_noi_mang != null ? Number(raw.free_noi_mang) : 0,
    free_ngoai_mang: raw?.free_ngoai_mang != null ? Number(raw.free_ngoai_mang) : 0,
    sms: raw?.sms != null ? Number(raw.sms) : 0,
    doi_tuong_ap_dung: raw?.doi_tuong_ap_dung || '',
    noi_dung_ngoai: raw?.noi_dung_ngoai || null,
    tien_ich_free: raw?.tien_ich_free || null,
    uudaitrong: raw?.uudaitrong || '',
    dangky: raw?.dangky || null,
    huygiahan: raw?.huygiahan || null,
    huygoicuoc: raw?.huygoicuoc || null,
    is_auto_renew: raw?.is_auto_renew !== undefined ? raw.is_auto_renew : true,
    service_group: raw?.service_group || '',
    registration_policy: raw?.registration_policy || 'ALLOW',
    allow_parallel_with: raw?.allow_parallel_with || [],
    system_type: raw?.system_type || '',
    is_addon: raw?.is_addon || false,
    requires_base_package: raw?.requires_base_package || false,
    benefit_group: raw?.benefit_group || ''
  };
}

/**
 * Kiểm tra xem gói cước hoặc feature document có khớp tên ứng dụng không
 */
function checkAppMatch(pkg, featureDoc, appName) {
  if (!appName) return false;
  const appLower = String(appName).toLowerCase().trim();

  const fieldsToSearch = [
    pkg?.tien_ich_free,
    pkg?.uudaitrong,
    pkg?.ten,
    pkg?.ma_goi,
    pkg?.benefit_group,
    pkg?.data_meta
  ];

  for (const field of fieldsToSearch) {
    if (field && String(field).toLowerCase().includes(appLower)) {
      return true;
    }
  }

  if (featureDoc) {
    if (appLower === 'youtube' && featureDoc?.has_youtube) return true;
    if (appLower === 'tiktok' && featureDoc?.has_tiktok) return true;
    if (appLower === 'facebook' && featureDoc?.has_facebook) return true;
    if (appLower === 'tv360' && featureDoc?.has_tv360) return true;
    if (appLower === 'movie' && featureDoc?.has_movie) return true;
    if (appLower === 'garena' && (featureDoc?.has_garena || /garena|liên\s*quân|free\s*fire/i.test(pkg?.tien_ich_free || pkg?.uudaitrong || pkg?.ten || pkg?.ma_goi || ''))) return true;
    if ((appLower === 'messenger' || appLower === 'instagram') && (featureDoc?.has_facebook || featureDoc?.has_social)) return true;
  }

  return false;
}

/**
 * Trích xuất mức GB/ngày từ chuỗi data_theo_ngay
 */
function parseDailyGb(dataTheoNgayStr) {
  if (!dataTheoNgayStr) return 0;
  const match = String(dataTheoNgayStr).match(/(\d+(?:\.\d+)?)\s*GB/i);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Pure RAG Package Matching Engine
 * @param {object} intent - Structured NLU Intent Object từ Pass 1
 * @returns {Promise<{ noMatchFound: boolean, packages: Array }>}
 */
const matchPackages = async (intent = {}) => {
  try {
    const safeIntent = intent || {};
    console.log('[Pure RAG Engine] Querying MongoDB for Intent:', JSON.stringify(safeIntent));

    const allDocs = await Package.find({ gia: { $gte: 0 } }).lean();

    if (!allDocs || allDocs.length === 0) {
      console.log('[Pure RAG Engine] MongoDB has 0 packages.');
      return { noMatchFound: true, packages: [] };
    }

    // ── ĐIỀU KIỆN ƯU TIÊN TUYỆT ĐỐI (DIRECT TARGET MATCHING) ────────────────
    if (safeIntent.target_package) {
      const targetCode = String(safeIntent.target_package).trim().toUpperCase();
      console.log(`[Pure RAG Engine] Direct Target Matching for code: "${targetCode}"`);

      // BẮT BUỘC chỉ query CSDL để lấy ĐÚNG 1 GÓI CƯỚC có mã bằng target_package (code == target_package)
      const exactDoc = allDocs.find(doc => {
        const maGoi = (doc?.ma_goi || '').trim().toUpperCase();
        return maGoi === targetCode;
      });

      if (exactDoc) {
        const pkg = normalizePackage(exactDoc);
        console.log(`[Pure RAG Engine] Direct Target Match SUCCESS: 1 package [${pkg.ma_goi} (${pkg.gia}đ)]`);
        return {
          noMatchFound: false,
          packages: [pkg]
        };
      } else {
        // NẾU KHÔNG TÌM THẤY GÓI TẠI CSDL: Trả về mảng rỗng [] (Tuyệt đối KHÔNG fallback vớt các gói khác)
        console.log(`[Pure RAG Engine] Direct Target Match FAILED: Package "${targetCode}" not found in DB. Returning []`);
        return {
          noMatchFound: true,
          packages: []
        };
      }
    }

    const packageIds = allDocs.map(p => p?.package_id).filter(Boolean);
    const featureDocs = await PackageFeature.find({ package_id: { $in: packageIds } }).lean();
    const featureMap = new Map();
    featureDocs.forEach(f => {
      if (f?.package_id) featureMap.set(f.package_id, f);
    });

    const maxBudgetLimit = safeIntent.budget_max || safeIntent.budget_exact;
    const isGeneralDataRequest = safeIntent.data_type === 'general' || (safeIntent.is_data_only && (!Array.isArray(safeIntent.apps) || safeIntent.apps.length === 0));
    const isAppSpecificRequest = safeIntent.data_type === 'app_specific' && Array.isArray(safeIntent.apps) && safeIntent.apps.length === 1;
    const isMonthlyRequest = safeIntent.duration_days === 30 || safeIntent.cycle_preference === 'monthly';

    // 1. Lọc tập gói cước khớp loại dịch vụ & chu kỳ
    const candidatePool = [];

    for (const doc of allDocs) {
      const pkg = normalizePackage(doc);
      const featureDoc = featureMap.get(doc?.package_id);
      let isValid = true;

      const dailyGb = parseDailyGb(pkg.data_theo_ngay);
      const hasGeneralData = (dailyGb > 0) || (
        pkg.data_theo_ngay && 
        String(pkg.data_theo_ngay).trim() !== '' && 
        String(pkg.data_theo_ngay).trim() !== '0' && 
        !/không có|0\s*gb|0gb/i.test(pkg.data_theo_ngay)
      );

      const isAppOnlyPackage = !hasGeneralData || (
        ['APP_META', 'APP_TIKTOK', 'APP_YOUTUBE', 'APP_TV360'].includes(pkg.benefit_group) ||
        String(pkg.data_theo_ngay).trim() === '0' ||
        String(pkg.data_theo_ngay).trim() === ''
      );

      const isComboPkg = (
        pkg.service_group === 'COMBO' ||
        pkg.system_type === 'COMBO' ||
        pkg.benefit_group === 'COMBO' ||
        pkg.phan_loai_goi?.toLowerCase() === 'combo' ||
        (pkg.free_noi_mang > 0 || pkg.free_ngoai_mang > 0)
      );

      // Gói 0đ
      const isFreeRequested = safeIntent.budget_exact === 0 || safeIntent.budget_max === 0;
      if (pkg.gia === 0) {
        const isTargetMatch = safeIntent.target_package && pkg.ma_goi.toUpperCase() === String(safeIntent.target_package).trim().toUpperCase();
        if (!isFreeRequested && !isTargetMatch) isValid = false;
      } else {
        if (isFreeRequested) isValid = false;
      }

      // Combo filtering
      if (isValid && safeIntent.is_combo) {
        if (!isComboPkg) isValid = false;
      }

      // Cycle filtering
      const cycleDays = Number(pkg.chu_ky_ngay) || 30;
      if (isValid && safeIntent.duration_days != null && safeIntent.duration_days > 0) {
        if (safeIntent.duration_days === 30 || safeIntent.duration_days === 31) {
          if (pkg.cycle_type === 'DAY' || cycleDays < 30) isValid = false;
        } else if (safeIntent.duration_days === 180) {
          if (cycleDays !== 180) isValid = false;
        } else if (safeIntent.duration_days === 360) {
          if (cycleDays < 360) isValid = false;
        } else {
          if (Math.abs(cycleDays - safeIntent.duration_days) > 7) isValid = false;
        }
      } else if (isValid && isMonthlyRequest) {
        if (pkg.cycle_type === 'DAY' || cycleDays < 30) isValid = false;
      } else if (isValid && safeIntent.cycle_preference === 'short') {
        if (cycleDays >= 30) isValid = false;
      } else if (isValid && safeIntent.cycle_preference === 'long_term') {
        if (cycleDays < 30) isValid = false;
      }

      // General Data filtering
      if (isValid && isGeneralDataRequest) {
        if (isAppOnlyPackage) isValid = false;
      }

      // App filtering
      if (isValid && Array.isArray(safeIntent.apps) && safeIntent.apps.length > 0) {
        const matchesAnyApp = safeIntent.apps.some(app => checkAppMatch(pkg, featureDoc, app));
        if (!matchesAnyApp && isAppSpecificRequest) isValid = false;
      }

      if (isValid) {
        candidatePool.push(pkg);
      }
    }

    if (candidatePool.length === 0) {
      console.log('[Pure RAG Engine] Candidate pool is empty.');
      return { noMatchFound: true, packages: [] };
    }

    // 2. Sắp xếp theo Ngân sách & Mức độ ưu tiên
    let resultPackages = [];

    if (maxBudgetLimit != null && maxBudgetLimit > 0) {
      const withinBudget = candidatePool.filter(p => p.gia > 0 && p.gia <= maxBudgetLimit);
      if (withinBudget.length > 0) {
        withinBudget.sort((a, b) => (maxBudgetLimit - a.gia) - (maxBudgetLimit - b.gia) || a.gia - b.gia);
        resultPackages = withinBudget.slice(0, 5);
      } else {
        candidatePool.sort((a, b) => a.gia - b.gia);
        resultPackages = candidatePool.slice(0, 5);
      }
    } else {
      candidatePool.sort((a, b) => a.gia - b.gia);
      resultPackages = candidatePool.slice(0, 5);
    }

    console.log(`[Pure RAG Engine] Successfully retrieved ${resultPackages.length} packages:`, resultPackages.map(p => `${p.ma_goi} (${p.gia}đ)`));

    return {
      noMatchFound: resultPackages.length === 0,
      packages: resultPackages
    };

  } catch (error) {
    console.error('[packageMatcher] Pure RAG Engine error:', error);
    return { noMatchFound: true, packages: [] };
  }
};

module.exports = {
  matchPackages,
  normalizePackage
};
