const subscriptionService = require('../services/subscriptionService');
const { logUserActivity, logOrMergeActivity } = require('../utils/userActivityLogger');

module.exports = {
  check: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const packageId = req.body.packageId !== undefined && req.body.packageId !== null ? req.body.packageId : req.body.package_id;

      if (packageId === undefined || packageId === null || packageId === '') {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin gói cước.' });
      }

      const result = await subscriptionService.checkSubscriptionConflict(userId, packageId);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (err) {
      res.status(200).json({
        success: true,
        action: 'ALLOW',
        message: 'Gói cước có thể sử dụng song song.',
        hasActive: false
      });
    }
  },

  register: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { cycle } = req.body;
      const packageId = req.body.packageId !== undefined && req.body.packageId !== null ? req.body.packageId : req.body.package_id;

      if (packageId === undefined || packageId === null || packageId === '') {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin gói cước.' });
      }

      const { subscription, account, pkg } = await subscriptionService.registerSubscription(userId, packageId, cycle);

      // Activity Logging for Subscription via logOrMergeActivity (Session-Scoped Package Aggregation)
      const targetPackageId = pkg ? pkg.package_id : packageId;
      const cleanKeyword = req.body?.search_keyword ? String(req.body.search_keyword).trim() : null;
      const requestSource = req.body?.source ? String(req.body.source).toLowerCase() : null;

      let targetFlowType = 'VIEW_SUBSCRIBE';
      let targetSource = 'detail';

      if (requestSource === 'compare' || req.body?.source === 'COMPARE') {
        targetFlowType = 'COMPARE_SUBSCRIBE';
        targetSource = 'compare';
      } else if (cleanKeyword || requestSource === 'search') {
        targetFlowType = 'SEARCH_SUBSCRIBE_DIRECT';
        targetSource = 'search';
      }

      await logOrMergeActivity({
        req,
        packageId: targetPackageId,
        actionType: 'SUBSCRIBE',
        flowType: targetFlowType,
        source: targetSource,
        searchKeyword: cleanKeyword
      });

      res.status(200).json({
        success: true,
        message: 'Đăng ký gói cước thành công!',
        data: subscription,
        balance: account.balance,
        activePackage: {
          packageId: pkg.ma_goi.toLowerCase(),
          activatedAt: subscription.activatedAt.toISOString(),
          expiresAt: subscription.expiresAt.toISOString()
        }
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  getActive: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const activeSubs = await subscriptionService.getActiveSubscriptions(userId);
      const Package = require('../models/Package');

      const mappedActive = [];
      for (const sub of activeSubs) {
        const pkg = await Package.findOne({ package_id: sub.packageId });
        if (pkg) {
          mappedActive.push({
            subscriptionId: sub._id,
            packageId: pkg.ma_goi.toLowerCase(),
            packageName: pkg.ten,
            description: pkg.uudaitrong || pkg.ten,
            data_theo_ngay: pkg.data_theo_ngay || '',
            data_meta: pkg.data_meta || null,
            free_noi_mang: typeof pkg.free_noi_mang === 'number' ? pkg.free_noi_mang : (parseInt(pkg.free_noi_mang) || 0),
            free_ngoai_mang: typeof pkg.free_ngoai_mang === 'number' ? pkg.free_ngoai_mang : (parseInt(pkg.free_ngoai_mang) || 0),
            tien_ich_free: pkg.tien_ich_free || null,
            benefit_group: pkg.benefit_group || 'DATA_MAIN',
            cycle: sub.cycle,
            activatedAt: typeof sub.activatedAt === 'string' ? sub.activatedAt : sub.activatedAt.toISOString(),
            expiresAt: typeof sub.expiresAt === 'string' ? sub.expiresAt : sub.expiresAt.toISOString(),
            autoRenew: sub.autoRenew !== undefined ? sub.autoRenew : true,
            support_auto_renew: pkg.support_auto_renew !== undefined ? pkg.support_auto_renew : (pkg.is_auto_renew !== undefined ? pkg.is_auto_renew : true),
            status: sub.status
          });
        }
      }

      res.status(200).json({
        success: true,
        activePackages: mappedActive
      });
    } catch (err) {
      res.status(200).json({
        success: true,
        activePackages: []
      });
    }
  },

  getHistory: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const history = await subscriptionService.getSubscriptionHistory(userId);
      const Package = require('../models/Package');

      const mappedHistory = [];
      for (const sub of history) {
        const pkg = await Package.findOne({ package_id: sub.packageId });
        if (pkg) {
          mappedHistory.push({
            subscriptionId: sub._id,
            packageId: pkg.ma_goi.toLowerCase(),
            packageName: pkg.ten,
            activatedAt: typeof sub.activatedAt === 'string' ? sub.activatedAt : sub.activatedAt.toISOString(),
            expiresAt: typeof sub.expiresAt === 'string' ? sub.expiresAt : sub.expiresAt.toISOString(),
            status: sub.status,
            cycle: sub.cycle
          });
        }
      }

      res.status(200).json({
        success: true,
        history: mappedHistory
      });
    } catch (err) {
      res.status(200).json({
        success: true,
        history: []
      });
    }
  },

  renew: async (req, res, next) => {
    try {
      res.status(501).json({ message: 'Chức năng gia hạn gói chưa được triển khai.' });
    } catch (err) {
      next(err);
    }
  },

  toggleAutoRenew: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { subscriptionId, autoRenew } = req.body;

      if (!subscriptionId || autoRenew === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request payload'
        });
      }

      const updatedSub = await subscriptionService.updateAutoRenew(userId, subscriptionId, autoRenew);
      res.status(200).json({
        success: true,
        message: autoRenew ? 'Bật tự động gia hạn thành công!' : 'Tắt tự động gia hạn thành công!',
        data: updatedSub
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  cancel: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request payload'
        });
      }

      let targetPackageId = null;
      try {
        const UserSubscription = require('../models/UserSubscription');
        const subDoc = await UserSubscription.findById(subscriptionId);
        if (subDoc) {
          targetPackageId = subDoc.packageId;
        }
      } catch (e) {}

      await subscriptionService.cancelSubscription(userId, subscriptionId);

      logUserActivity({
        req,
        actionType: 'CANCEL',
        packageId: targetPackageId
      });

      res.status(200).json({
        success: true,
        message: 'Hủy đăng ký gói cước thành công!'
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  clearHistory: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      await subscriptionService.clearSubscriptionHistory(userId);
      res.status(200).json({
        success: true,
        message: 'Xóa lịch sử đăng ký gói cước thành công!'
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  deleteHistoryItem: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const subscriptionId = req.params.id || req.body.subscriptionId;
      if (!subscriptionId) {
        return res.status(400).json({ success: false, message: 'Thiếu subscriptionId' });
      }
      await subscriptionService.deleteSubscriptionHistoryItem(userId, subscriptionId);
      res.status(200).json({
        success: true,
        message: 'Xóa lịch sử gói cước thành công!'
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  getVirtualTime: async (req, res, next) => {
    try {
      const { getVirtualDate, isCustomTime } = require('../utils/virtualTime');
      res.status(200).json({
        success: true,
        virtualTime: getVirtualDate().toISOString(),
        isCustom: isCustomTime()
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  setVirtualTime: async (req, res, next) => {
    try {
      const { setVirtualDate, advanceVirtualTime, getVirtualDate, isCustomTime } = require('../utils/virtualTime');
      const { customTime, days, hours } = req.body;

      if (customTime) {
        setVirtualDate(customTime);
      } else if (days !== undefined || hours !== undefined) {
        const msToAdd = ((Number(days) || 0) * 24 * 3600 * 1000) + ((Number(hours) || 0) * 3600 * 1000);
        advanceVirtualTime(msToAdd);
      }

      await subscriptionService.processAutoRenewals();

      let updatedBalance;
      if (req.user && req.user.user_id) {
        const Account = require('../models/Account');
        const acc = await Account.findOne({ user_id: req.user.user_id });
        if (acc) updatedBalance = acc.balance;
      }

      res.status(200).json({
        success: true,
        message: 'Đã cập nhật thời gian ảo hệ thống thành công!',
        virtualTime: getVirtualDate().toISOString(),
        isCustom: isCustomTime(),
        updatedBalance
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  resetVirtualTime: async (req, res, next) => {
    try {
      const { resetVirtualTime, getVirtualDate, isCustomTime } = require('../utils/virtualTime');
      resetVirtualTime();

      await subscriptionService.processAutoRenewals();

      let updatedBalance;
      if (req.user && req.user.user_id) {
        const Account = require('../models/Account');
        const acc = await Account.findOne({ user_id: req.user.user_id });
        if (acc) updatedBalance = acc.balance;
      }

      res.status(200).json({
        success: true,
        message: 'Đã cài lại thời gian thực hệ thống!',
        virtualTime: getVirtualDate().toISOString(),
        isCustom: isCustomTime(),
        updatedBalance
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};
