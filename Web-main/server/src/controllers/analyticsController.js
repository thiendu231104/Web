const mongoose = require('mongoose');
const UserSubscription = require('../models/UserSubscription');
const Deposit = require('../models/Deposit');
const UserActivity = require('../models/UserActivity');
const ChatHistory = require('../models/ChatHistory');
const Package = require('../models/Package');
const CompareHistory = require('../models/CompareHistory');
const SurveyHistory = require('../models/SurveyHistory');

/**
 * Parse Date Range from custom startDate & endDate strings (YYYY-MM-DD)
 * or fallback to range ('today', '7d', '30d', 'all').
 * Evaluated in Vietnam Timezone (GMT+7).
 */
function parseVietnamDateRange(startDateStr, endDateStr, range) {
  if (range === 'all') {
    return null; // No date match filter applied (fetches all historical data)
  }

  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const now = new Date();
  const vnNow = new Date(now.getTime() + vnOffsetMs);

  let startUtc, endUtc;

  if (startDateStr && endDateStr) {
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);

    const startVn = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
    const endVn = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

    startUtc = new Date(startVn.getTime() - vnOffsetMs);
    endUtc = new Date(endVn.getTime() - vnOffsetMs);
  } else if (range === 'today') {
    const yyyy = vnNow.getUTCFullYear();
    const mm = vnNow.getUTCMonth();
    const dd = vnNow.getUTCDate();

    const startVn = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0, 0));
    const endVn = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999));

    startUtc = new Date(startVn.getTime() - vnOffsetMs);
    endUtc = new Date(endVn.getTime() - vnOffsetMs);
  } else if (range === '7d') {
    const yyyy = vnNow.getUTCFullYear();
    const mm = vnNow.getUTCMonth();
    const dd = vnNow.getUTCDate();

    const startVn = new Date(Date.UTC(yyyy, mm, dd - 6, 0, 0, 0, 0));
    const endVn = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999));

    startUtc = new Date(startVn.getTime() - vnOffsetMs);
    endUtc = new Date(endVn.getTime() - vnOffsetMs);
  } else if (range === '30d') {
    const yyyy = vnNow.getUTCFullYear();
    const mm = vnNow.getUTCMonth();
    const dd = vnNow.getUTCDate();

    const startVn = new Date(Date.UTC(yyyy, mm, dd - 29, 0, 0, 0, 0));
    const endVn = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999));

    startUtc = new Date(startVn.getTime() - vnOffsetMs);
    endUtc = new Date(endVn.getTime() - vnOffsetMs);
  } else {
    // Default fallback: 1st of current month to today GMT+7
    const yyyy = vnNow.getUTCFullYear();
    const mm = vnNow.getUTCMonth();
    const dd = vnNow.getUTCDate();

    const startVn = new Date(Date.UTC(yyyy, mm, 1, 0, 0, 0, 0));
    const endVn = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999));

    startUtc = new Date(startVn.getTime() - vnOffsetMs);
    endUtc = new Date(endVn.getTime() - vnOffsetMs);
  }

  return { from: startUtc, to: endUtc };
}

function safeNum(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

/**
 * GET /api/admin/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&range=...
 */
const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, range } = req.query;
    const dateFilter = parseVietnamDateRange(startDate, endDate, range);

    // ── Build Match Conditions ──────────────────────────────────────────────

    // UserSubscription match
    const subMatch = { isDeleted: { $ne: true } };
    if (dateFilter) {
      subMatch.$expr = {
        $and: [
          {
            $gte: [
              { $toDate: { $ifNull: ['$registeredAt', '$createdAt'] } },
              new Date(dateFilter.from)
            ]
          },
          {
            $lte: [
              { $toDate: { $ifNull: ['$registeredAt', '$createdAt'] } },
              new Date(dateFilter.to)
            ]
          }
        ]
      };
    }

    // Deposit match
    const depMatch = { status: 'success', isDeleted: { $ne: true } };
    if (dateFilter) {
      depMatch.$expr = {
        $and: [
          { $gte: [{ $toDate: '$created_at' }, new Date(dateFilter.from)] },
          { $lte: [{ $toDate: '$created_at' }, new Date(dateFilter.to)] }
        ]
      };
    }

    // ChatHistory match
    const chatMatch = { sender: 'user', isDeleted: { $ne: true } };
    if (dateFilter) {
      chatMatch.$expr = {
        $and: [
          { $gte: [{ $toDate: '$createdAt' }, new Date(dateFilter.from)] },
          { $lte: [{ $toDate: '$createdAt' }, new Date(dateFilter.to)] }
        ]
      };
    }

    // UserActivity match
    const actMatch = {};
    if (dateFilter) {
      actMatch.$expr = {
        $and: [
          { $gte: [{ $toDate: '$created_at' }, new Date(dateFilter.from)] },
          { $lte: [{ $toDate: '$created_at' }, new Date(dateFilter.to)] }
        ]
      };
    }

    // CompareHistory match
    const cmpMatch = {};
    if (dateFilter) {
      cmpMatch.$expr = {
        $and: [
          { $gte: [{ $toDate: '$created_at' }, new Date(dateFilter.from)] },
          { $lte: [{ $toDate: '$created_at' }, new Date(dateFilter.to)] }
        ]
      };
    }

    // SurveyHistory match
    const survMatch = { deleted: { $ne: true } };
    if (dateFilter) {
      survMatch.$expr = {
        $and: [
          { $gte: [{ $toDate: '$createdAt' }, new Date(dateFilter.from)] },
          { $lte: [{ $toDate: '$createdAt' }, new Date(dateFilter.to)] }
        ]
      };
    }

    // ── Parallel Aggregation Pipelines ──────────────────────────────────────
    const [
      subRevResult,
      depResult,
      activePkgCount,
      chatCount,
      subTrends,
      topPkgsResult,
      distResult,
      keywordsResult,
      mostViewedRaw,
      flowsResult,
      subStatusResult,
      subAutoRenewResult,
      compareTotalCount,
      compareCompletedCount,
      topComparedPkgsResult,
      surveyHistoriesRaw,
      chatGuestCount,
      chatUserCount,
      recentDeposits,
      recentActivities,
      recentChats
    ] = await Promise.all([
      // 1. Subscription Revenue
      UserSubscription.aggregate([
        { $match: subMatch },
        {
          $lookup: {
            from: 'goi_cuoc',
            let: { pid: '$packageId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$package_id', '$$pid'] } } },
              { $project: { gia: 1 } }
            ],
            as: 'pkg'
          }
        },
        { $unwind: { path: '$pkg', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$pkg.gia' }
          }
        }
      ]),

      // 2. Web3 Deposits Sum (status='success')
      Deposit.aggregate([
        { $match: depMatch },
        {
          $group: {
            _id: null,
            sumVND: { $sum: { $ifNull: ['$amountVND', 0] } },
            sumETH: { $sum: { $toDouble: { $ifNull: ['$amountETH', '0'] } } }
          }
        }
      ]),

      // 3. Active Packages Count
      UserSubscription.countDocuments({ status: 'ACTIVE', isDeleted: { $ne: true } }),

      // 4. Chatbot User Interactions Count
      ChatHistory.countDocuments(chatMatch),

      // 5. Daily Trend Aggregation
      UserSubscription.aggregate([
        { $match: subMatch },
        {
          $project: {
            regDate: { $toDate: { $ifNull: ['$registeredAt', '$createdAt'] } },
            packageId: 1
          }
        },
        {
          $lookup: {
            from: 'goi_cuoc',
            let: { pid: '$packageId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$package_id', '$$pid'] } } },
              { $project: { gia: 1 } }
            ],
            as: 'pkg'
          }
        },
        { $unwind: { path: '$pkg', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$regDate', timezone: '+07:00' } },
            subscriptions: { $sum: 1 },
            revenue: { $sum: '$pkg.gia' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 6. Top Packages Aggregation (Subscribed)
      UserSubscription.aggregate([
        { $match: subMatch },
        { $group: { _id: '$packageId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'goi_cuoc',
            let: { pid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$package_id', '$$pid'] } } },
              { $project: { ten: 1, ma_goi: 1, gia: 1 } }
            ],
            as: 'pkg'
          }
        },
        { $unwind: { path: '$pkg', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            packageId: '$_id',
            packageCode: { $ifNull: ['$pkg.ma_goi', { $toString: '$_id' }] },
            packageName: { $ifNull: ['$pkg.ten', { $concat: ['Gói #', { $toString: '$_id' }] }] },
            price: { $ifNull: ['$pkg.gia', 0] },
            count: '$count',
            revenue: { $multiply: ['$count', { $ifNull: ['$pkg.gia', 0] }] }
          }
        }
      ]),

      // 7. Distribution by goi_cuoc.phan_loai_goi
      UserSubscription.aggregate([
        { $match: subMatch },
        {
          $lookup: {
            from: 'goi_cuoc',
            let: { pid: '$packageId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$package_id', '$$pid'] } } },
              { $project: { phan_loai_goi: 1 } }
            ],
            as: 'pkg'
          }
        },
        { $unwind: { path: '$pkg', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$pkg.phan_loai_goi', 'Data'] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $project: { category: '$_id', count: '$count', _id: 0 } }
      ]),

      // 8. Top Search Keywords
      UserActivity.aggregate([
        {
          $match: {
            ...actMatch,
            search_keyword: { $ne: null, $exists: true, $nin: ['', 'null', 'undefined', ' '] }
          }
        },
        {
          $project: {
            cleanKeyword: { $trim: { input: '$search_keyword' } }
          }
        },
        { $match: { cleanKeyword: { $ne: '' } } },
        { $group: { _id: '$cleanKeyword', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { keyword: '$_id', count: '$count', _id: 0 } }
      ]),

      // 9. Top 5 Most Viewed Packages (VIEW_PACKAGE in user_activities)
      UserActivity.aggregate([
        {
          $match: {
            ...actMatch,
            action_type: 'VIEW_PACKAGE',
            package_id: { $ne: null, $exists: true }
          }
        },
        {
          $group: {
            _id: { $toInt: '$package_id' },
            viewCount: { $sum: 1 }
          }
        },
        { $sort: { viewCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'goi_cuoc',
            let: { pid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$package_id', '$$pid'] } } },
              { $project: { ten: 1, ma_goi: 1, gia: 1 } }
            ],
            as: 'pkg'
          }
        },
        { $unwind: { path: '$pkg', preserveNullAndEmptyArrays: true } }
      ]),

      // 10. Flows Summary by flow_type in user_activities
      UserActivity.aggregate([
        { $match: actMatch },
        { $group: { _id: '$flow_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // 11. Subscription Lifecycle Status Breakdown
      UserSubscription.aggregate([
        { $match: subMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // 12. Subscription AutoRenew Breakdown
      UserSubscription.aggregate([
        { $match: subMatch },
        { $group: { _id: '$autoRenew', count: { $sum: 1 } } }
      ]),

      // 13. Compare Histories Total Count
      CompareHistory.countDocuments(cmpMatch),

      // 14. Compare Histories Completed Count
      CompareHistory.countDocuments({
        ...cmpMatch,
        $or: [{ status: 'COMPLETED' }, { completed: true }]
      }),

      // 15. Top Compared Packages
      CompareHistory.aggregate([
        { $match: cmpMatch },
        { $unwind: '$packages_compared' },
        { $match: { packages_compared: { $ne: null, $ne: '' } } },
        { $group: { _id: '$packages_compared', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // 16. Survey Histories Raw for Top Needs Analysis
      SurveyHistory.find(survMatch).select('answers').lean(),

      // 17. Chatbot Guest Messages Count
      ChatHistory.countDocuments({ ...chatMatch, source: 'guest' }),

      // 18. Chatbot User Messages Count
      ChatHistory.countDocuments({ ...chatMatch, source: 'user' }),

      // 19. Recent Live Activity Stream (Deposits)
      Deposit.find({ isDeleted: { $ne: true } })
        .sort({ created_at: -1 })
        .limit(10)
        .lean(),

      // 20. Recent Live Activity Stream (User Activities)
      UserActivity.find({
        action_type: { $in: ['VIEW_PACKAGE', 'SEARCH', 'COMPARE', 'SUBSCRIBE', 'RENEW', 'CANCEL', 'COMPARE_AND_SUBSCRIBE'] }
      })
        .sort({ created_at: -1 })
        .limit(15)
        .lean(),

      // 21. Recent Live Activity Stream (Chat Histories)
      ChatHistory.find({ sender: 'user', isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // ── Build Most Viewed Packages with Buy Count & Conversion Rate % (Capped & Stable Sorted)
    const allMostViewed = await Promise.all(
      mostViewedRaw.map(async item => {
        const pkgId = item._id;
        const viewCount = safeNum(item.viewCount);

        const buyCount = await UserSubscription.countDocuments({
          ...subMatch,
          packageId: pkgId
        });

        const rawRate = viewCount > 0 ? (buyCount / viewCount) * 100 : 0;
        const conversionRate = Math.min(Math.round(rawRate * 10) / 10, 100);

        return {
          packageId: pkgId,
          packageCode: item.pkg?.ma_goi || `Gói #${pkgId}`,
          packageName: item.pkg?.ten || `Gói cước #${pkgId}`,
          price: safeNum(item.pkg?.gia),
          viewCount,
          buyCount,
          conversionRate
        };
      })
    );

    // Multi-criteria stable sort: viewCount DESC -> buyCount DESC -> packageId ASC
    allMostViewed.sort((a, b) => {
      if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
      if (b.buyCount !== a.buyCount) return b.buyCount - a.buyCount;
      return a.packageId - b.packageId;
    });

    const mostViewedPackages = allMostViewed.slice(0, 5);

    // ── Build Continuous Date Timeline (GMT+7) ──────────────────────────────
    const trendMap = {};
    subTrends.forEach(st => {
      if (st._id) {
        trendMap[st._id] = { revenue: st.revenue, subscriptions: st.subscriptions };
      }
    });

    const vnOffsetMs = 7 * 60 * 60 * 1000;
    const now = new Date();
    const vnNow = new Date(now.getTime() + vnOffsetMs);

    let startDateObj, endDateObj;
    if (dateFilter) {
      startDateObj = new Date(dateFilter.from.getTime() + vnOffsetMs);
      endDateObj = new Date(dateFilter.to.getTime() + vnOffsetMs);
    } else {
      if (subTrends.length > 0 && subTrends[0]._id) {
        const [ey, em, ed] = subTrends[0]._id.split('-').map(Number);
        startDateObj = new Date(Date.UTC(ey, em - 1, ed, 0, 0, 0, 0));
      } else {
        startDateObj = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() - 29, 0, 0, 0, 0));
      }
      endDateObj = vnNow;
    }

    const timelineDates = [];
    const curr = new Date(startDateObj.getTime());
    while (curr <= endDateObj) {
      const yyyy = curr.getUTCFullYear();
      const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(curr.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const displayDate = `${dd}/${mm}`;
      timelineDates.push({ date: dateStr, displayDate });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const trend = timelineDates.map(item => {
      const found = trendMap[item.date] || { revenue: 0, subscriptions: 0 };
      return {
        date: item.date,
        displayDate: item.displayDate,
        revenue: safeNum(found.revenue),
        subscriptions: safeNum(found.subscriptions)
      };
    });

    // ── Process Flows Summary ──────────────────────────────────────────────
    const flowLabels = {
      SEARCH_VIEW: 'Tìm kiếm → Xem chi tiết',
      SEARCH_VIEW_SUBSCRIBE: 'Tìm kiếm → Xem chi tiết → Đăng ký',
      SEARCH_SUBSCRIBE_DIRECT: 'Tìm kiếm → Đăng ký trực tiếp',
      VIEW_ONLY: 'Chỉ xem chi tiết',
      VIEW_SUBSCRIBE: 'Xem chi tiết → Đăng ký',
      COMPARE_SUBSCRIBE: 'So sánh → Đăng ký'
    };

    const totalFlowCount = flowsResult.reduce((sum, f) => sum + safeNum(f.count), 0);

    const flowsSummary = flowsResult.map(f => {
      const cnt = safeNum(f.count);
      const pct = totalFlowCount > 0 ? Math.round((cnt / totalFlowCount) * 1000) / 10 : 0;
      return {
        flowType: f._id || 'UNKNOWN',
        label: flowLabels[f._id] || f._id,
        count: cnt,
        percentage: pct
      };
    });

    // ── Process Subscription Lifecycle ─────────────────────────────────────
    const subStatusMap = { ACTIVE: 0, CANCELLED: 0, EXPIRED: 0, REPLACED: 0 };
    subStatusResult.forEach(st => {
      if (st._id && subStatusMap[st._id] !== undefined) {
        subStatusMap[st._id] = safeNum(st.count);
      }
    });

    let autoRenewOn = 0;
    let autoRenewOff = 0;
    subAutoRenewResult.forEach(ar => {
      if (ar._id === true) autoRenewOn = safeNum(ar.count);
      else autoRenewOff += safeNum(ar.count);
    });

    const totalAutoRenewSub = autoRenewOn + autoRenewOff;
    const autoRenewRate = totalAutoRenewSub > 0 ? Math.round((autoRenewOn / totalAutoRenewSub) * 1000) / 10 : 0;

    const subLifecycle = {
      active: subStatusMap.ACTIVE,
      cancelled: subStatusMap.CANCELLED,
      expired: subStatusMap.EXPIRED,
      replaced: subStatusMap.REPLACED,
      autoRenewOn,
      autoRenewOff,
      autoRenewRate
    };

    // ── Process Compare Stats ──────────────────────────────────────────────
    const compareStats = {
      total: safeNum(compareTotalCount),
      completed: safeNum(compareCompletedCount),
      completionRate: compareTotalCount > 0 ? Math.round((compareCompletedCount / compareTotalCount) * 1000) / 10 : 0,
      topCompared: topComparedPkgsResult.map(t => ({
        packageCode: String(t._id),
        count: safeNum(t.count)
      }))
    };

    // ── Process Survey Stats & Top 3 Needs ──────────────────────────────────
    const needCounts = {};
    const answerLabels = {
      Data: 'Chỉ Data lướt web',
      Combo: 'Combo (Data + Gọi thoại)',
      MXH: 'Mạng xã hội & Tiện ích',
      Gia_re: 'Phân khúc Giá rẻ (< 50k)',
      Trung_binh: 'Phân khúc Trung bình (50k-150k)',
      Cao_cap: 'Phân khúc Cao cấp (> 150k)',
      short: 'Chu kỳ Ngắn ngày (<= 15 ngày)',
      monthly: 'Chu kỳ Tháng (30 ngày)',
      long: 'Chu kỳ dài (>= 90 ngày)',
      TikTok: 'Ưu đãi cước TikTok',
      YouTube: 'Ưu đãi cước YouTube',
      Facebook: 'Ưu đãi cước Facebook',
      TV360: 'Ưu đãi cước TV360'
    };

    surveyHistoriesRaw.forEach(s => {
      if (s.answers && typeof s.answers === 'object') {
        Object.values(s.answers).forEach(val => {
          if (val && typeof val === 'string') {
            const label = answerLabels[val] || val;
            needCounts[label] = (needCounts[label] || 0) + 1;
          }
        });
      }
    });

    const topNeeds = Object.entries(needCounts)
      .map(([need, count]) => ({ need, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const surveyStats = {
      total: surveyHistoriesRaw.length,
      topNeeds
    };

    const chatbotStats = {
      total: safeNum(chatCount),
      guest: safeNum(chatGuestCount),
      user: safeNum(chatUserCount)
    };

    // ── Merge Live Activities Stream ───────────────────────────────────────
    const liveStream = [];

    recentDeposits.forEach(d => {
      liveStream.push({
        id: `dep_${d.deposit_id || d._id}`,
        type: 'deposit',
        title: `Nạp ví Web3 #${d.deposit_id || ''}`,
        subtitle: `+${(d.amountVND || 0).toLocaleString('vi-VN')}đ (${d.amountETH || 0} ETH) · ${d.status}`,
        timestamp: d.created_at || new Date().toISOString(),
        source: 'deposits'
      });
    });

    const actionLabels = {
      SUBSCRIBE: 'Đăng ký gói cước',
      RENEW: 'Gia hạn gói cước',
      CANCEL: 'Hủy gói cước',
      SEARCH: 'Tìm kiếm gói cước',
      VIEW_PACKAGE: 'Xem chi tiết gói cước',
      COMPARE: 'So sánh gói cước',
      COMPARE_AND_SUBSCRIBE: 'So sánh & Đăng ký'
    };

    recentActivities.forEach(a => {
      const actionName = actionLabels[a.action_type] || a.action_type;
      const detail = a.search_keyword ? `Từ khóa: "${a.search_keyword}"` : (a.package_id ? `Gói ID: #${a.package_id}` : '');
      liveStream.push({
        id: `act_${a._id}`,
        type: 'activity',
        title: actionName,
        subtitle: detail ? `${detail} · User #${a.user_id || 'Guest'}` : `User #${a.user_id || 'Guest'}`,
        timestamp: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
        source: 'user_activities'
      });
    });

    recentChats.forEach(c => {
      liveStream.push({
        id: `chat_${c._id}`,
        type: 'chat',
        title: 'Hỏi đáp Chatbot AI',
        subtitle: `"${c.text ? c.text.substring(0, 35) + '...' : ''}"`,
        timestamp: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        source: 'chat_histories'
      });
    });

    liveStream.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const liveActivities = liveStream.slice(0, 20);

    // ── Response Payload ───────────────────────────────────────────────────
    const subRev = subRevResult[0] || {};
    const depData = depResult[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          subscriptionRevenue: safeNum(subRev.totalRevenue),
          web3DepositsVND: safeNum(depData.sumVND),
          web3DepositsETH: safeNum(depData.sumETH),
          activePackages: safeNum(activePkgCount),
          chatbotInteractions: safeNum(chatCount)
        },
        trend,
        topPackages: topPkgsResult.map(p => ({
          packageId: p.packageId,
          packageCode: p.packageCode,
          packageName: p.packageName,
          price: safeNum(p.price),
          count: safeNum(p.count),
          revenue: safeNum(p.revenue)
        })),
        mostViewedPackages,
        distribution: distResult.map(d => ({
          category: d.category || 'Khác',
          count: safeNum(d.count)
        })),
        searchKeywords: keywordsResult.map(k => ({
          keyword: k.keyword,
          count: safeNum(k.count)
        })),
        flowsSummary,
        subLifecycle,
        compareStats,
        surveyStats,
        chatbotStats,
        liveActivities
      }
    });

  } catch (error) {
    console.error('Admin Analytics API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xuất dữ liệu báo cáo quản trị.'
    });
  }
};

module.exports = { getAnalytics };
