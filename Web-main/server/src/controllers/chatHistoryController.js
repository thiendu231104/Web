const ChatHistory = require('../models/ChatHistory');

const chatHistoryController = {
  getHistory: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const history = await ChatHistory.find({ userId, isDeleted: false })
        .sort({ createdAt: 1 })
        .lean();

      // Format response data to ChatMessage structure
      const formattedHistory = history.map(item => ({
        id: item._id.toString(),
        sender: item.sender,
        text: item.text,
        suggestedAction: item.suggestedAction || undefined,
        matchedPackages: item.matchedPackages && item.matchedPackages.length > 0 ? item.matchedPackages : (item.packages || []),
        packages: item.packages && item.packages.length > 0 ? item.packages : (item.matchedPackages || []),
        createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString()
      }));

      return res.status(200).json({
        success: true,
        message: 'Lấy lịch sử chatbot thành công.',
        data: formattedHistory
      });
    } catch (error) {
      next(error);
    }
  },

  deleteHistory: async (req, res, next) => {
    try {
      const userId = req.user._id;
      await ChatHistory.updateMany(
        { userId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() }
      );

      return res.status(200).json({
        success: true,
        message: 'Xóa lịch sử chatbot thành công.'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = chatHistoryController;
