const Notification = require('../models/Notification');
const { getVirtualDate } = require('../utils/virtualTime');

const notificationService = {
  createNotification: async ({ userId, title, content, type, link, subscriptionId }) => {
    try {
      const notification = new Notification({
        userId,
        title,
        content,
        type,
        link: link || '',
        status: 'UNREAD',
        isDeleted: false,
        createdAt: getVirtualDate(),
        subscriptionId: subscriptionId || null
      });
      return await notification.save();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  getNotifications: async (userId) => {
    try {
      return await Notification.find({
        userId,
        isDeleted: { $ne: true }
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  },

  getUnreadCount: async (userId) => {
    try {
      return await Notification.countDocuments({
        userId,
        status: 'UNREAD',
        isDeleted: { $ne: true }
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  },

  markAllAsRead: async (userId) => {
    try {
      return await Notification.updateMany(
        { userId, status: 'UNREAD', isDeleted: { $ne: true } },
        { $set: { status: 'READ' } }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  markAsRead: async (userId, notificationId) => {
    try {
      return await Notification.updateOne(
        { _id: notificationId, userId },
        { $set: { status: 'READ' } }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  softDeleteAll: async (userId) => {
    try {
      return await Notification.updateMany(
        { userId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
    } catch (error) {
      console.error('Error soft deleting notifications:', error);
      throw error;
    }
  }
};

module.exports = notificationService;
