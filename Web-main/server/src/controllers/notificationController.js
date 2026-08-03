const notificationService = require('../services/notificationService');

const notificationController = {
  getNotifications: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const list = await notificationService.getNotifications(userId);
      return res.status(200).json({
        success: true,
        data: list
      });
    } catch (error) {
      next(error);
    }
  },

  getUnreadCount: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const count = await notificationService.getUnreadCount(userId);
      return res.status(200).json({
        success: true,
        data: count
      });
    } catch (error) {
      next(error);
    }
  },

  markAllAsRead: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      await notificationService.markAllAsRead(userId);
      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu đọc toàn bộ thông báo.'
      });
    } catch (error) {
      next(error);
    }
  },

  markAsRead: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { id } = req.params;
      await notificationService.markAsRead(userId, id);
      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu đọc thông báo.'
      });
    } catch (error) {
      next(error);
    }
  },

  softDeleteAll: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      await notificationService.softDeleteAll(userId);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa toàn bộ lịch sử thông báo.'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = notificationController;
