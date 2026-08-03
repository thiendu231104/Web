/**
 * packageMatcher.js — In-Memory Recommendation Engine (Stage 2)
 *
 * GIAI ĐOẠN 2: CHẤM ĐIỂM TRONG BỘ NHỚ THEO CÁC TRƯỜNG DỮ LIỆU NGUYÊN BẢN CỦA MONGODB
 * 1. FETCH ALL: Nạp toàn bộ gói cước từ MongoDB lên RAM.
 * 2. SAFE NORMALIZATION: Chuẩn hóa dữ liệu với Optional Chaining an toàn tuyệt đối.
 * 3. HARD FILTER ENGINE: Lọc cứng theo các trường nguyên bản (phan_loai_goi, data_theo_ngay, data_meta, tien_ich_free, free_noi_mang, free_ngoai_mang, gia, chu_ky_ngay).
 * 4. SOFT SCORING & TIE-BREAKER: Sắp xếp theo score giảm dần, trả về Top 1 đến Top 5 gói cước cao điểm nhất.
 */

const Package = require('../../models/Package');
const PackageFeature = require('../../models/PackageFeature');

/**
 * Chuẩn hoá một gói cước từ Mongoose document thành plain object (An toàn tuyệt đối)
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
 * Kiểm tra xem gói cước hoặc tiện ích có chứa tên ứng dụng không
 */
function checkAppMatch(pkg, featureDoc, appName) {
  if (!appName) return false;
  const appLower = String(appName).toLowerCase().trim();

  const fieldsToSearch = [
    pkg?.tien_ich_free,
    pkg?.uudaitrong,
    pkg?.ten,
    pkg?.ma_goi,
    pkg?.diem_noi_bat,
    pkg?.benefit_group
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
  }

  return false;
}

/**
 * Entry point chính của In-Memory Recommendation Engine
 * @param {object} intent - Intent object thu được từ Pass 1
 * @returns {Promise<{ noMatchFound: boolean, packages: Array }>}
 */
const matchPackages = async (intent = {}) => {
  try {
    const safeIntent = intent || {};
    console.log('[In-Memory Recommendation Engine] Safe Intent:', JSON.stringify(safeIntent));

    // BƯỚC 1: FETCH ALL - Lấy tất cả gói cước có giá >= 0 từ MongoDB lên RAM
    const allDocs = await Package.find({ gia: { $gte: 0 } }).lean();

    if (!allDocs || allDocs.length === 0) {
      console.log('[In-Memory Engine] DB has 0 packages.');
      return { noMatchFound: true, packages: [] };
    }

    const packageIds = allDocs.map(p => p?.package_id).filter(Boolean);
    const featureDocs = await PackageFeature.find({ package_id: { $in: packageIds } }).lean();
    const featureMap = new Map();
    featureDocs.forEach(f => {
      if (f?.package_id) featureMap.set(f.package_id, f);
    });

    const matchedItems = [];

    for (const doc of allDocs) {
      const pkg = normalizePackage(doc);
      const featureDoc = featureMap.get(doc?.package_id);
      let isValid = true;
      let score = 0;

      // ── BỘ QUY TẮC LỌC CỨNG (HARD FILTERS - BẮT BUỘC MATCH 100%) ───────────

      // 1. Cách ly gói 0 đồng (Trừ khi người dùng hỏi đích danh hoặc hỏi gói 0đ/miễn phí)
      const isFreeRequested = safeIntent.budget_exact === 0 || safeIntent.budget_max === 0;
      if (pkg.gia === 0) {
        const isTargetMatch = safeIntent.target_package && pkg.ma_goi.toUpperCase() === String(safeIntent.target_package).trim().toUpperCase();
        if (!isFreeRequested && !isTargetMatch) {
          isValid = false;
        }
      } else {
        if (isFreeRequested) {
          isValid = false;
        }
      }

      // 2. target_package: Mã gói cước phải khớp hoàn toàn
      if (isValid && safeIntent.target_package) {
        const targetCode = String(safeIntent.target_package).trim().toUpperCase();
        if (pkg.ma_goi.toUpperCase() !== targetCode) {
          isValid = false;
        }
      }

      // 3. Khớp Ngân Sách (gia): [budget_min, budget_max] hoặc <= budget_max / <= budget_exact
      if (isValid && safeIntent.budget_min != null && safeIntent.budget_min > 0) {
        if (pkg.gia < safeIntent.budget_min) isValid = false;
      }
      if (isValid && safeIntent.budget_max != null && safeIntent.budget_max > 0) {
        if (pkg.gia > safeIntent.budget_max) isValid = false;
      }
      if (isValid && safeIntent.budget_exact != null && safeIntent.budget_exact > 0) {
        if (pkg.gia > safeIntent.budget_exact) isValid = false;
      }

      // 4. Khớp Chu Kỳ (chu_ky_ngay & cycle_type):
      const cycleDays = Number(pkg.chu_ky_ngay) || 0;
      const cycleType = pkg.cycle_type || (cycleDays >= 30 ? 'MONTH' : 'DAY');

      // Safe-fallback 1: Nếu budget <= 20000 nhưng duration >= 24 (do AI Pass 1 nhầm 24h) -> Tự động ép duration về 1 ngày
      let durMin = safeIntent.duration_min;
      let durMax = safeIntent.duration_max;
      const effectiveBudget = safeIntent.budget_max || safeIntent.budget_exact || safeIntent.budget_min || 0;

      if (effectiveBudget > 0 && effectiveBudget <= 20000 && ((durMin != null && durMin >= 24) || (durMax != null && durMax >= 24))) {
        durMin = 1;
        durMax = 1;
      }

      // Safe-fallback 2: Nếu ngân sách >= 50000 HOẶC là gói Combo HOẶC câu hỏi chứa "tháng" nhưng duration bị nhầm thành 1 ngày -> Loại bỏ ép 1 ngày
      const isHighBudgetOrComboOrMonthly = effectiveBudget >= 50000 || safeIntent.is_combo === true || (safeIntent.user_query && /tháng|\/tháng|thang/i.test(safeIntent.user_query));
      if (isHighBudgetOrComboOrMonthly && (durMin === 1 || durMax === 1)) {
        durMin = null;
        durMax = null;
      }

      const hasMonthlyKeyword = safeIntent.user_query && /tháng|thang/i.test(safeIntent.user_query);
      const hasDailyKeyword = safeIntent.user_query && /ngày|ngay|tuần|tuan|24h|24\s*giờ/i.test(safeIntent.user_query);

      const isMonthlyRequested = 
        safeIntent.cycle_preference === 'monthly' || 
        safeIntent.period === 'month' || 
        hasMonthlyKeyword ||
        (durMin != null && durMin >= 30);

      const isShortTermRequested = 
        safeIntent.cycle_preference === 'short' || 
        safeIntent.is_short_term === true || 
        (durMax != null && durMax <= 15) ||
        (durMin != null && durMin <= 15) ||
        hasDailyKeyword;

      if (isValid && isMonthlyRequested) {
        // Hỏi theo Tháng -> Lọc cycle_type === 'MONTH' HOẶC chu_ky_ngay >= 30
        if (cycleType === 'DAY' || cycleDays < 30) {
          isValid = false;
        }
      } else if (isValid && isShortTermRequested) {
        // Hỏi theo Ngày/Tuần -> Lọc cycle_type === 'DAY' HOẶC chu_ky_ngay < 30
        if (cycleType === 'MONTH' || cycleDays >= 30) {
          isValid = false;
        }
      }

      if (isValid && durMin != null && durMin > 0) {
        if (cycleDays < durMin) isValid = false;
      }
      if (isValid && durMax != null && durMax > 0) {
        if (cycleDays > durMax) isValid = false;
      }

      // ── BỘ QUY TẮC NHU CẦU THEO TRƯỜNG DỮ LIỆU NGUYÊN BẢN ───────────────────
      const hasDailyData = !!(pkg.data_theo_ngay && String(pkg.data_theo_ngay).trim() !== '' && String(pkg.data_theo_ngay).trim() !== '0');
      const hasMetaData = !!(pkg.data_meta && String(pkg.data_meta).trim() !== '' && String(pkg.data_meta).trim() !== '0');
      const hasFreeApps = !!(pkg.tien_ich_free && String(pkg.tien_ich_free).trim() !== '' && String(pkg.tien_ich_free).trim() !== '0');
      const hasVoice = (Number(pkg.free_noi_mang) || 0) > 0 || (Number(pkg.free_ngoai_mang) || 0) > 0;

      const phanLoai = String(pkg.phan_loai_goi || '').trim();
      const sysType = String(pkg.system_type || '').trim();

      const hasApps = Array.isArray(safeIntent.apps) && safeIntent.apps.length > 0;
      const isComboNeed = safeIntent.is_combo === true || safeIntent.need_type === 'COMBO';
      const isSocialNeed = !isComboNeed && (hasApps || safeIntent.need_type === 'SOCIAL' || safeIntent.is_social === true);
      const isPureDataOnly = !isComboNeed && !isSocialNeed && (safeIntent.is_data_only === true || safeIntent.need_type === 'DATA');

      // QUY TẮC 1: Nhu cầu "Gói COMBO (Vừa có Data vừa có Phút gọi)"
      if (isValid && isComboNeed) {
        const isComboType = phanLoai.toLowerCase() === 'combo' || sysType.toUpperCase() === 'COMBO' || hasVoice;
        if (!isComboType) {
          isValid = false;
        }
      }

      // QUY TẮC 2: Nhu cầu "Data thuần / Phát Hotspot / Lướt web" (Không cần MXH/App)
      if (isValid && !isComboNeed && isPureDataOnly) {
        if (!hasDailyData) {
          isValid = false;
        }
      }

      // QUY TẮC 3: Nhu cầu "Mạng xã hội / App tiện ích cụ thể" (TikTok, Facebook, YouTube, TV360...)
      if (isValid && !isComboNeed && isSocialNeed) {
        let matchesSocial = false;
        if (hasApps) {
          matchesSocial = safeIntent.apps.some(app => checkAppMatch(pkg, featureDoc, app));
        } else {
          matchesSocial = hasMetaData || hasFreeApps;
        }
        if (!matchesSocial) {
          isValid = false;
        }
      }

      // Ràng buộc danh sách apps chỉ định (HOÀN TOÀN BỎ QUA ĐỐI VỚI GÓI COMBO)
      if (isValid && hasApps && !isComboNeed) {
        if (safeIntent.app_match_type === 'AND') {
          const hasAllApps = safeIntent.apps.every(app => checkAppMatch(pkg, featureDoc, app));
          if (!hasAllApps) isValid = false;
        } else {
          const hasAnyApp = safeIntent.apps.some(app => checkAppMatch(pkg, featureDoc, app));
          if (!hasAnyApp) isValid = false;
        }
      }

      // Nếu không vượt qua Lọc CỨNG -> Bỏ qua gói này
      if (!isValid) continue;

      // ── CHẤM ĐIỂM MỀM (SOFT SCORING) ────────────────────────────────────────

      // 1. Điểm Ngân Sách
      const userBudget = safeIntent.budget_exact || safeIntent.budget_max;
      if (userBudget != null && userBudget > 0) {
        if (pkg.gia === userBudget) {
          score += 60;
        } else if (pkg.gia < userBudget) {
          const ratio = pkg.gia / userBudget;
          if (ratio >= 0.7) {
            score += 45;
          } else if (ratio >= 0.5) {
            score += 20;
          } else {
            if (isShortTermRequested) {
              score += 15;
            } else {
              score -= 10;
            }
          }
        }
      }

      // 2. Điểm Chu Kỳ
      if (isMonthlyRequested && cycleDays === 30) {
        score += 50;
      } else if (isShortTermRequested && cycleDays <= 15) {
        score += 40;
      }

      // 3. Khớp chính xác ứng dụng yêu cầu
      if (hasApps) {
        let matchedAppCount = 0;
        for (const app of safeIntent.apps) {
          if (checkAppMatch(pkg, featureDoc, app)) matchedAppCount++;
        }
        if (matchedAppCount > 0) score += 50;
        if (matchedAppCount > 1) score += (matchedAppCount - 1) * 20;
      }

      // 4. Hot & 5G
      if ((pkg.dohot || '').toLowerCase() === 'hot') score += 10;
      const maGoiUpper = (pkg.ma_goi || '').toUpperCase();
      const tenUpper = (pkg.ten || '').toUpperCase();
      if (maGoiUpper.includes('5G') || tenUpper.includes('5G')) score += 15;

      // Tie-breaker
      score += (Number(pkg.package_id) || 0) * 0.001;

      matchedItems.push({ package: pkg, score });
    }

    // BƯỚC 3: KẾT QUẢ TẦNG 2 - Sắp xếp theo score giảm dần
    matchedItems.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.package.gia - b.package.gia;
    });

    const resultPackages = matchedItems.slice(0, 5).map(item => item.package);

    console.log(
      `[In-Memory Engine SUCCESS] Matched ${resultPackages.length} packages:`,
      matchedItems.slice(0, 5).map(item => `${item.package.ma_goi} (Score: ${item.score})`)
    );

    return {
      noMatchFound: resultPackages.length === 0,
      packages: resultPackages
    };

  } catch (error) {
    console.error('[packageMatcher] In-Memory engine error:', error);
    return { noMatchFound: true, packages: [] };
  }
};

module.exports = {
  matchPackages,
  normalizePackage
};
