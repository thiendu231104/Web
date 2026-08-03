const transactionService = require('../services/transactionService');

const transactionController = {
  deposit: async (req, res, next) => {
    try {
      const { amount, method, txHash, walletAddress, network, depositId } = req.body;
      if (amount === undefined || amount === null || amount === '') {
        return res.status(400).json({
          success: false,
          message: 'Số tiền nạp là bắt buộc.'
        });
      }

      let result;
      if (txHash && walletAddress && network) {
        result = await transactionService.depositBlockchain(
          req.user.user_id,
          amount,
          network,
          txHash,
          walletAddress,
          depositId
        );
      } else {
        result = await transactionService.depositFiat(
          req.user.user_id,
          amount
        );
      }

      return res.status(200).json({
        success: true,
        message: `Nạp tiền thành công! Số dư mới là ${result.balance.toLocaleString()}đ.`,
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  subscribePackage: async (req, res, next) => {
    try {
      const { packageId } = req.body;
      if (!packageId) {
        return res.status(400).json({
          success: false,
          message: 'Mã gói cước đăng ký là bắt buộc.'
        });
      }

      const result = await transactionService.subscribePackage(req.user.user_id, packageId);
      return res.status(200).json({
        success: true,
        message: 'Đăng ký gói cước thành công!',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  unsubscribePackage: async (req, res, next) => {
    try {
      const { packageId } = req.params;
      if (!packageId) {
        return res.status(400).json({
          success: false,
          message: 'Mã gói cước hủy là bắt buộc.'
        });
      }

      await transactionService.unsubscribePackage(req.user.user_id, packageId);
      return res.status(200).json({
        success: true,
        message: 'Hủy gia hạn gói cước thành công!'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getTransactions: async (req, res, next) => {
    try {
      const txs = await transactionService.getTransactionsForUser(req.user.user_id);
      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách giao dịch thành công.',
        data: txs
      });
    } catch (error) {
      next(error);
    }
  },

  createPendingDeposit: async (req, res, next) => {
    try {
      const { amount, network, walletAddress, txHash } = req.body;
      const dep = await transactionService.createPendingDeposit(
        req.user.user_id,
        amount,
        network,
        walletAddress,
        txHash
      );
      return res.status(200).json({
        success: true,
        message: 'Đã tạo lệnh nạp tiền chờ xử lý.',
        data: dep
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  cancelDeposit: async (req, res, next) => {
    try {
      const { depositId, txHash } = req.body;
      const result = await transactionService.cancelPendingDeposit(
        req.user.user_id,
        depositId || txHash
      );
      return res.status(200).json({
        success: true,
        message: 'Đã hủy lệnh nạp tiền.',
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  clearTransactions: async (req, res, next) => {
    try {
      await transactionService.clearAllTransactions(req.user.user_id);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa tất cả lịch sử giao dịch thành công.'
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminStats: async (req, res, next) => {
    try {
      const stats = await transactionService.getAdminDashboardStats();
      return res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu báo cáo thống kê thành công.',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminStatsCards: async (req, res, next) => {
    try {
      const stats = await transactionService.getAdminStatsCards();
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminRevenueTrends: async (req, res, next) => {
    try {
      const trends = await transactionService.getAdminRevenueTrends();
      return res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminRecentTransactions: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const totalItems = req.query.totalItems ? parseInt(req.query.totalItems) : null;
      const result = await transactionService.getAdminRecentTransactions(page, limit, totalItems);
      return res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminDeposits: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status || '';
      const search = req.query.search || '';

      const result = await transactionService.getAdminDeposits({ page, limit, status, search });
      return res.status(200).json({
        success: true,
        data: result.deposits,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = transactionController;
