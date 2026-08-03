const CompareHistory = require('../models/CompareHistory');
const Package = require('../models/Package');
const aiService = require('../services/ai/ai.service');

const sanitizeMaGoiArray = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  return Array.from(new Set(arr.map(item => String(item).trim()).filter(Boolean)));
};

/**
 * 1. Khởi tạo / Cập nhật phiên so sánh (Session Tracking - Upsert)
 * Route: POST /api/compare/session
 */
exports.saveCompareSession = async (req, res, next) => {
  try {
    const {
      session_id,
      guest_id,
      is_guest,
      packages_compared,
      final_packages,
      selected_package,
      compare_duration,
      completed,
      cleared_by_user,
      status,
      cleared_at
    } = req.body;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }

    const userId = req.user ? req.user.user_id : null;
    const isGuest = req.user ? false : (is_guest !== undefined ? is_guest : true);

    const cleanPackagesCompared = sanitizeMaGoiArray(packages_compared);
    const cleanFinalPackages = sanitizeMaGoiArray(final_packages);
    const cleanSelectedPkg = selected_package ? String(selected_package).trim() : null;

    const updateFields = {
      updated_at: new Date(),
      is_guest: isGuest,
      status: status || 'ACTIVE'
    };

    if (userId) updateFields.user_id = userId;
    if (guest_id) updateFields.guest_id = String(guest_id).trim();
    if (completed !== undefined) updateFields.completed = completed;
    if (cleared_by_user !== undefined) updateFields.cleared_by_user = cleared_by_user;
    if (cleared_at) updateFields.cleared_at = cleared_at;
    if (cleanSelectedPkg !== null) updateFields.selected_package = cleanSelectedPkg;
    if (compare_duration !== undefined) updateFields.compare_duration = compare_duration;

    // Ghi đè mảng gói so sánh hiện tại trong phiên để duy trì 1 bản ghi duy nhất per session
    if (cleanPackagesCompared.length > 0) {
      updateFields.packages_compared = cleanPackagesCompared;
      updateFields.final_packages = cleanPackagesCompared;
      updateFields.compare_count = cleanPackagesCompared.length;
    }

    if (cleanFinalPackages.length > 0) {
      updateFields.final_packages = cleanFinalPackages;
    }

    const doc = await CompareHistory.findOneAndUpdate(
      { session_id },
      { $set: updateFields },
      { new: true, upsert: true, returnDocument: 'after' }
    );

    return res.json({ success: true, message: 'Session updated successfully', data: doc });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Kết thúc phiên so sánh (Beacon / Navigator safe)
 * Route: POST /api/compare/session/close
 */
exports.closeCompareSession = async (req, res, next) => {
  try {
    const { session_id, compare_duration, status, selected_package } = req.body;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }

    const cleanSelectedPkg = selected_package ? String(selected_package).trim() : null;

    const updateFields = {
      status: status || 'ABANDONED',
      updated_at: new Date()
    };

    if (compare_duration !== undefined) {
      updateFields.compare_duration = compare_duration;
    }

    if (status === 'COMPLETED') {
      updateFields.completed = true;
    } else if (status === 'CLEARED') {
      updateFields.cleared_by_user = true;
      updateFields.cleared_at = new Date();
    }

    if (cleanSelectedPkg !== null) {
      updateFields.selected_package = cleanSelectedPkg;
    }

    const doc = await CompareHistory.findOneAndUpdate(
      { session_id },
      { $set: updateFields },
      { new: true, returnDocument: 'after' }
    );

    return res.json({ success: true, message: 'Session closed successfully', data: doc });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Phân tích nhận xét gói cước bằng AI LLM thực tế theo mảng chuỗi ma_goi
 * Route: POST /api/compare/ai-analyze
 */
exports.analyzeCompareAI = async (req, res, next) => {
  try {
    const rawList = req.body.maGoiList || req.body.packageIds || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({ success: false, message: 'maGoiList array is required' });
    }

    // Chuẩn hóa mảng ma_goi chuỗi, trim khoảng trắng
    const maGoiList = Array.from(new Set(rawList.map(item => String(item).trim()).filter(Boolean)));

    if (maGoiList.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid maGoiList array' });
    }

    // Truy vấn thông tin gói cước từ CSDL goi_cuoc theo ma_goi duy nhất
    const packages = await Package.find({ ma_goi: { $in: maGoiList } }).lean();

    if (packages.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: "Không tìm thấy thông tin gói cước để phân tích.",
          best_value: "Vui lòng chọn các gói cước hợp lệ trong danh mục.",
          recommendation: "Hãy chọn tối đa 3 gói cước để đối chiếu ưu đãi chi tiết."
        }
      });
    }

    // Dựng Prompt phân tích gửi cho LLM (Tư vấn cô đọng 2-4 câu tự nhiên)
    const packageDetailsText = packages.map(p => {
      const days = parseInt(p.chu_ky_ngay) || 1;
      const monthlyCost = Math.round((p.gia / days) * 30);
      const isGeneralData = p.data_theo_ngay && p.data_theo_ngay !== '0';
      const isMetaData = !!p.data_meta;

      return `- Gói ${p.ma_goi}: Giá ${new Intl.NumberFormat('vi-VN').format(p.gia)}đ cho ${p.chu_ky_ngay} ngày (~${monthlyCost.toLocaleString('vi-VN')}đ/tháng). Data đa dụng: ${isGeneralData ? p.data_theo_ngay : 'Không'}. Data Meta/MXH: ${isMetaData ? p.data_meta : 'Không'}. Thoại: ${p.free_noi_mang ? p.free_noi_mang + ' nội mạng' : 'Không'}. Tiện ích: ${p.tien_ich_free || 'Không'}.`;
    }).join('\n');

    const prompt = `Bạn là Trợ lý Tư vấn Cước Viettel. Hãy đưa ra nhận xét so sánh ngắn gọn, tự nhiên cho các gói cước người dùng chọn dưới đây:

${packageDetailsText}

YÊU CẦU NGHIÊM NGẶT VỀ PHONG CÁCH VÀ NỘI DUNG:
1. Độ dài: CHỈ TỪ 2 ĐẾN 4 CÂU VĂN TỰ NHIÊN (tối đa 1 đoạn so sánh ngắn + 1 câu gợi ý nhu cầu).
2. TUYỆT ĐỐI KHÔNG chia thành các mục/section nhỏ (như "Tóm tắt", "So sánh", "Phân tích", "Khuyến nghị"). KHÔNG dùng các cụm từ chung chung rập khuôn như "Các gói cước có sự khác biệt rõ rệt".
3. So sánh thẳng điểm khác biệt hoặc giống nhau cốt lõi:
   - Nếu các gói CÙNG quyền lợi hoặc CÙNG chi phí quy đổi/tháng: Nêu rõ điểm giống nhau (VD: cùng 50GB Meta/30 ngày và ~30k/tháng), chỉ khác ở chu kỳ dài hạn (trả trước nhiều hơn, không phải đăng ký lại nhiều lần) vs chu kỳ ngắn (trả trước ít hơn, linh hoạt).
   - Nếu một gói chuyên app (Meta/Facebook) và một gói đa dụng (SD90...): Nói rõ gói chuyên app tiết kiệm chi phí nếu chỉ dùng app đó (lướt web ngoài sẽ tốn chi phí); còn gói đa dụng phù hợp nếu cần lướt web/app tự do cho mọi ứng dụng.
4. Gợi ý theo nhu cầu thực tế: Đưa ra lời khuyên "Nếu bạn cần [Nhu cầu A] thì chọn [Gói X]; còn muốn [Nhu cầu B] thì chọn [Gói Y]". KHÔNG đánh giá gói nào "tốt hơn tuyệt đối". KHÔNG lặp lại tên gói nhiều lần. KHÔNG tự suy diễn ngoài dữ liệu trên.
5. Định dạng: Trả về duy nhất MỘT chuỗi JSON sạch (không dùng markdown codeblock \`\`\`json):
{
  "advice": "Chuỗi văn bản 2-4 câu ngắn gọn, tự nhiên..."
}`;

    let parsedJSON = null;

    try {
      let aiRawResponse = await aiService.generateContent(prompt);

      if (typeof aiRawResponse === 'string') {
        let cleanText = aiRawResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        try {
          parsedJSON = JSON.parse(cleanText);
        } catch (e) {
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedJSON = JSON.parse(jsonMatch[0]);
          }
        }
      }
    } catch (aiErr) {
      console.error('[Compare AI Controller] Error generating AI analysis:', aiErr.message);
    }

    if (parsedJSON) {
      const text = parsedJSON.advice || parsedJSON.summary || parsedJSON.recommendation || '';
      const cleanText = typeof text === 'string' ? text.replace(/^(💡|⚖️|💰|🔥|Tóm tắt|So sánh|Phân tích|Khuyến nghị|Gợi ý).*\n+/gi, '').trim() : String(text);
      parsedJSON = {
        advice: cleanText,
        summary: cleanText,
        best_value: '',
        recommendation: ''
      };
    } else {
      // Fallback an toàn
      const formattedPkgs = packages.map(p => {
        const days = parseInt(p.chu_ky_ngay) || 1;
        const monthly = Math.round((p.gia / days) * 30);
        return `${p.ma_goi} (${new Intl.NumberFormat('vi-VN').format(p.gia)}đ/${days} ngày, ~${monthly.toLocaleString('vi-VN')}đ/tháng)`;
      }).join(' và ');

      const fallbackAdvice = `${formattedPkgs} có mức chi phí quy đổi và phạm vi ưu đãi khác nhau. Nếu bạn ưu tiên tối ưu chi phí cho ứng dụng chỉ định, hãy cân nhắc gói chuyên dụng; còn nếu cần data linh hoạt cho mọi nhu cầu lướt web, gói Data đa dụng sẽ là lựa chọn phù hợp hơn.`;

      parsedJSON = {
        advice: fallbackAdvice,
        summary: fallbackAdvice,
        best_value: '',
        recommendation: ''
      };
    }

    // Sanitizer: Đảm bảo tất cả các trường trả về đều là String, biến Object thành String nếu AI vi phạm
    if (parsedJSON) {
      if (typeof parsedJSON.recommendation === 'object' && parsedJSON.recommendation !== null) {
        parsedJSON.recommendation = Object.entries(parsedJSON.recommendation)
          .map(([key, val]) => `- ${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
          .join('\n');
      } else if (typeof parsedJSON.recommendation !== 'string') {
        parsedJSON.recommendation = String(parsedJSON.recommendation || '');
      }

      if (typeof parsedJSON.summary === 'object' && parsedJSON.summary !== null) {
        parsedJSON.summary = Object.values(parsedJSON.summary).map(v => String(v)).join(' ');
      } else if (typeof parsedJSON.summary !== 'string') {
        parsedJSON.summary = String(parsedJSON.summary || '');
      }

      if (typeof parsedJSON.best_value === 'object' && parsedJSON.best_value !== null) {
        parsedJSON.best_value = Object.entries(parsedJSON.best_value)
          .map(([key, val]) => `${key}: ${String(val)}`)
          .join('; ');
      } else if (typeof parsedJSON.best_value !== 'string') {
        parsedJSON.best_value = String(parsedJSON.best_value || '');
      }
    }

    return res.json({
      success: true,
      data: parsedJSON
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Lấy thống kê so sánh (Admin Analytics)
 * Route: GET /api/compare/analytics
 */
exports.getCompareAnalytics = async (req, res, next) => {
  try {
    const histories = await CompareHistory.find({});

    const totalSessions = histories.length;
    if (totalSessions === 0) {
      return res.json({
        success: true,
        data: {
          totalSessions: 0,
          mostComparedPackages: [],
          mostPopularPairs: [],
          conversionRate: 0,
          averageDuration: 0,
          resetCount: 0,
          guestUserRatio: { guest: 0, user: 0 },
          lastSelectedPackages: []
        }
      });
    }

    const packageCompareCounts = {};
    const pairCounts = {};
    let totalDuration = 0;
    let resetCount = 0;
    let guestCount = 0;
    let userCount = 0;
    const selectedPackageCounts = {};
    let completedCount = 0;

    histories.forEach(h => {
      if (h.packages_compared && Array.isArray(h.packages_compared)) {
        h.packages_compared.forEach(pkgId => {
          packageCompareCounts[pkgId] = (packageCompareCounts[pkgId] || 0) + 1;
        });

        const uniquePkgs = Array.from(new Set(h.packages_compared)).sort();
        if (uniquePkgs.length >= 2) {
          for (let i = 0; i < uniquePkgs.length; i++) {
            for (let j = i + 1; j < uniquePkgs.length; j++) {
              const pairKey = `${uniquePkgs[i]} - ${uniquePkgs[j]}`;
              pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
            }
          }
        }
      }

      totalDuration += h.compare_duration || 0;

      if (h.status === 'CLEARED' || h.cleared_by_user) {
        resetCount++;
      }

      if (h.is_guest) {
        guestCount++;
      } else {
        userCount++;
      }

      if (h.completed) {
        completedCount++;
      }

      if (h.selected_package) {
        selectedPackageCounts[h.selected_package] = (selectedPackageCounts[h.selected_package] || 0) + 1;
      }
    });

    const mostComparedPackages = Object.entries(packageCompareCounts)
      .map(([pkgId, count]) => ({ packageId: pkgId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const mostPopularPairs = Object.entries(pairCounts)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const lastSelectedPackages = Object.entries(selectedPackageCounts)
      .map(([pkgId, count]) => ({ packageId: pkgId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const conversionRate = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    return res.json({
      success: true,
      data: {
        totalSessions,
        mostComparedPackages,
        mostPopularPairs,
        conversionRate,
        averageDuration,
        resetCount,
        guestUserRatio: { guest: guestCount, user: userCount },
        lastSelectedPackages
      }
    });
  } catch (error) {
    next(error);
  }
};
