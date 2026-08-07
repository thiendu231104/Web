/**
 * packageMatcher.js — RAG Hybrid Retrieval & Business Ranking Engine
 *
 * GIAI ĐOẠN 2 & 3 TRONG KIẾN TRÚC CHATBOT AI:
 * Structured Requirements → Database Retrieval → Business Ranking (Soft Scoring)
 *
 * 1. Database Retrieval: Truy vấn MongoDB lấy các gói cước từ collection `goi_cuoc` (Package)
 *    và `package_features` (PackageFeature).
 * 2. Hard Filtering: Loại bỏ các gói cước vi phạm điều kiện cứng (ngân sách, loại gói, target).
 * 3. Business Ranking: Chấm điểm mềm (Soft Scoring) áp dụng cấu hình từ `scoring_config.json`,
 *    ưu tiên General Data hơn App-specific khi data_type là "general".
 * 4. Grounded Output: Trả về Top 3 đến Top 5 gói cước tối ưu nhất cho LLM Pass 2.
 */

const Package = require('../../models/Package');
const PackageFeature = require('../../models/PackageFeature');
const scoringConfig = require('./scoring_config.json');

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
    if ((appLower === 'messenger' || appLower === 'instagram') && (featureDoc?.has_facebook || featureDoc?.has_social)) return true;
  }

  return false;
}

/**
 * Trích xuất mức GB/ngày từ chuỗi data_theo_ngay (ví dụ: "1.5GB/ngày" -> 1.5)
 */
function parseDailyGb(dataTheoNgayStr) {
  if (!dataTheoNgayStr) return 0;
  const match = String(dataTheoNgayStr).match(/(\d+(?:\.\d+)?)\s*GB/i);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * RAG Hybrid Retrieval & Ranking Engine
 * @param {object} intent - Structured NLU Intent Object từ Pass 1
 * @returns {Promise<{ noMatchFound: boolean, packages: Array }>}
 */
const matchPackages = async (intent = {}) => {
  try {
    const safeIntent = intent || {};
    console.log('[RAG Matching Engine] Processing NLU Intent:', JSON.stringify(safeIntent));

    // BƯỚC 1: Truy vấn tất cả gói cước từ MongoDB
    const allDocs = await Package.find({ gia: { $gte: 0 } }).lean();

    if (!allDocs || allDocs.length === 0) {
      console.log('[RAG Matching Engine] DB has 0 packages.');
      return { noMatchFound: true, packages: [] };
    }

    const packageIds = allDocs.map(p => p?.package_id).filter(Boolean);
    const featureDocs = await PackageFeature.find({ package_id: { $in: packageIds } }).lean();
    const featureMap = new Map();
    featureDocs.forEach(f => {
      if (f?.package_id) featureMap.set(f.package_id, f);
    });

    const candidates = [];

    // BƯỚC 2 & 3: Lọc cứng & Chấm điểm nghiệp vụ (Business Soft Scoring)
    for (const doc of allDocs) {
      const pkg = normalizePackage(doc);
      const featureDoc = featureMap.get(doc?.package_id);
      let isValid = true;
      let score = 0;

      // ── HARD FILTERING ──────────────────────────────────────────────────────

      // 1. Gói 0 đồng: Chỉ hiển thị khi hỏi trực tiếp gói 0đ/miễn phí hoặc đích danh mã gói
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

      // 2. target_package: Nếu nhắc đích danh mã gói
      if (isValid && safeIntent.target_package) {
        const targetCode = String(safeIntent.target_package).trim().toUpperCase();
        const pkgCode = pkg.ma_goi.toUpperCase();
        if (pkgCode !== targetCode && !pkgCode.includes(targetCode) && !targetCode.includes(pkgCode)) {
          isValid = false;
        }
      }

      // 3. Ngân sách (Budget limits)
      if (isValid && safeIntent.budget_min != null && safeIntent.budget_min > 0) {
        if (pkg.gia < safeIntent.budget_min) isValid = false;
      }
      if (isValid && safeIntent.budget_max != null && safeIntent.budget_max > 0) {
        if (pkg.gia > safeIntent.budget_max) isValid = false;
      }
      if (isValid && safeIntent.budget_exact != null && safeIntent.budget_exact > 0) {
        if (pkg.gia > safeIntent.budget_exact) isValid = false;
      }

      // 4. Chu kỳ (Cycle / Duration)
      const cycleDays = Number(pkg.chu_ky_ngay) || 30;

      if (isValid && safeIntent.cycle_preference === 'short') {
        if (cycleDays >= 30 && safeIntent.duration_days && safeIntent.duration_days <= 15) {
          isValid = false;
        }
      } else if (isValid && safeIntent.cycle_preference === 'monthly') {
        if (cycleDays < 30) {
          isValid = false;
        }
      } else if (isValid && safeIntent.cycle_preference === 'long_term') {
        if (cycleDays < 30) {
          isValid = false;
        }
      }

      // 5. Yêu cầu ứng dụng cụ thể (Apps) khi app_match_type = 'AND'
      if (isValid && Array.isArray(safeIntent.apps) && safeIntent.apps.length > 0) {
        if (safeIntent.app_match_type === 'AND') {
          const hasAllApps = safeIntent.apps.every(app => checkAppMatch(pkg, featureDoc, app));
          if (!hasAllApps) isValid = false;
        }
      }

      if (!isValid) continue;

      // ── BUSINESS RANKING (SOFT SCORING) ────────────────────────────────────

      // 1. Chấm điểm theo Ngân sách (Price / Budget Score)
      const userBudget = safeIntent.budget_exact || safeIntent.budget_max;
      if (userBudget != null && userBudget > 0) {
        if (pkg.gia === userBudget) {
          score += 50;
        } else if (pkg.gia < userBudget) {
          const ratio = pkg.gia / userBudget;
          score += Math.round(ratio * 40);
        }
      }

      // Ưu tiên gói rẻ hơn nếu người dùng muốn "tiết kiệm", "rẻ nhất"
      if (safeIntent.price_preference === 'cheapest') {
        score += (scoringConfig.cheap_data?.is_cheap || 12);
        if (pkg.gia <= 90000) score += 20;
        score += Math.max(0, Math.round((200000 - pkg.gia) / 10000));
      }

      // 2. Chấm điểm theo Chu kỳ (Cycle Matching Score)
      if (safeIntent.duration_days != null && safeIntent.duration_days > 0) {
        const diff = Math.abs(cycleDays - safeIntent.duration_days);
        if (diff === 0) {
          score += 40;
        } else if (diff <= 7) {
          score += 25;
        } else if (diff <= 15) {
          score += 15;
        }
      } else {
        if (safeIntent.cycle_preference === 'monthly' && cycleDays === 30) {
          score += 30;
        } else if (safeIntent.cycle_preference === 'long_term') {
          if (cycleDays >= 90) {
            score += (scoringConfig.long_term?.base || 10) + (cycleDays === 360 ? 25 : 15);
          } else if (cycleDays >= 30) {
            score += 5;
          }
        } else if (safeIntent.cycle_preference === 'short' && cycleDays <= 15) {
          score += 25;
        }
      }

      // 3. Chấm điểm theo Data Type (General Data vs App-Only / Feature-Only)
      const dailyGb = parseDailyGb(pkg.data_theo_ngay);
      const hasGeneralData = (dailyGb > 0) || (
        pkg.data_theo_ngay && 
        String(pkg.data_theo_ngay).trim() !== '' && 
        String(pkg.data_theo_ngay).trim() !== '0' && 
        !/không có|0\s*gb|0gb/i.test(pkg.data_theo_ngay)
      );

      const isAppOnlyOrFeatureOnly = !hasGeneralData && (
        !!pkg.tien_ich_free || 
        !!pkg.data_meta || 
        (featureDoc && (featureDoc.has_tv360 || featureDoc.has_youtube || featureDoc.has_tiktok || featureDoc.has_facebook || featureDoc.is_social))
      );

      if (safeIntent.data_type === 'general' && (!Array.isArray(safeIntent.apps) || safeIntent.apps.length === 0)) {
        if (hasGeneralData) {
          score += 45; // Cộng điểm cao cho gói cước Data dùng chung
        } else if (isAppOnlyOrFeatureOnly || !hasGeneralData) {
          score -= 60; // Trừ điểm nặng các gói cước App-Only / Feature-Only khi khách chỉ tìm data lướt web chung
        }
      }

      // 4. Chấm điểm theo Ứng dụng & MXH (App Match Score)
      if (Array.isArray(safeIntent.apps) && safeIntent.apps.length > 0) {
        let matchedAppCount = 0;
        for (const app of safeIntent.apps) {
          if (checkAppMatch(pkg, featureDoc, app)) {
            matchedAppCount++;
            const appWeight = scoringConfig.benefit_group?.[app.toLowerCase()] || 15;
            score += appWeight;
          }
        }
        if (matchedAppCount > 0) {
          score += 25;
        }
      }

      // 5. Chấm điểm Nhu cầu Data nhiều (Data Volume Preference)
      if (safeIntent.data_volume_preference === 'high') {
        if (dailyGb >= 2.0 || String(pkg.data_theo_ngay).includes('không giới hạn') || String(pkg.uudaitrong).includes('không giới hạn')) {
          score += (scoringConfig.data_features?.high_data || 20);
        } else if (dailyGb >= 1.0) {
          score += (scoringConfig.data_features?.has_real_data || 6);
        }
      }

      // 6. Chấm điểm Combo Gọi Điện (Voice / Combo Score)
      const hasVoice = (Number(pkg.free_noi_mang) || 0) > 0 || (Number(pkg.free_ngoai_mang) || 0) > 0;
      const isComboPkg = pkg.phan_loai_goi.toLowerCase() === 'combo' || hasVoice;

      if (safeIntent.is_combo) {
        if (isComboPkg) {
          score += (scoringConfig.combo?.is_combo || 12);
          if (pkg.free_noi_mang > 0 && pkg.free_ngoai_mang > 0) {
            score += (scoringConfig.combo?.both_data_voice || 8);
          }
        }
      } else if (safeIntent.is_data_only) {
        if (!hasVoice) {
          score += 15;
        }
      }

      // 7. Thưởng gói HOT & 5G
      if ((pkg.dohot || '').toLowerCase() === 'hot') {
        score += 10;
      }
      const maGoiUpper = (pkg.ma_goi || '').toUpperCase();
      const tenUpper = (pkg.ten || '').toUpperCase();
      if (maGoiUpper.includes('5G') || tenUpper.includes('5G')) {
        score += (scoringConfig.five_g || 10);
      }

      // Tie-breaker nhẹ
      score += (Number(pkg.package_id) || 0) * 0.0001;

      candidates.push({ package: pkg, score });
    }

    // BƯỚC 4: Sắp xếp theo score giảm dần, sau đó theo giá tăng dần
    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.package.gia - b.package.gia;
    });

    const resultPackages = candidates.slice(0, 5).map(item => item.package);

    console.log(
      `[RAG Matching Engine SUCCESS] Matched ${resultPackages.length} packages:`,
      candidates.slice(0, 5).map(item => `${item.package.ma_goi} (Score: ${item.score.toFixed(1)}, Price: ${item.package.gia})`)
    );

    return {
      noMatchFound: resultPackages.length === 0,
      packages: resultPackages
    };

  } catch (error) {
    console.error('[packageMatcher] RAG Matching Engine error:', error);
    return { noMatchFound: true, packages: [] };
  }
};

module.exports = {
  matchPackages,
  normalizePackage
};
