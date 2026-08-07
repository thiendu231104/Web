const mongoose = require('mongoose');

/**
 * ChatSession — Session State Document
 *
 * Mỗi session đại diện cho một "chu kỳ tìm kiếm" gói cước của người dùng.
 * - ACTIVE: Session đang hoạt động, candidatePackageIds có thể lọc tiếp.
 * - CLOSED: Requirement thay đổi căn bản, session cũ đã đóng; backend sẽ tạo session mới.
 *
 * LLM KHÔNG quản lý session. Backend quyết định hoàn toàn.
 */
const chatSessionSchema = new mongoose.Schema({
  // Định danh phiên — lấy từ sessionId (guest) hoặc userId (user đã đăng nhập)
  sessionKey: { type: String, required: true, index: true },

  // Ai sở hữu session này?
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null, index: true },
  sessionId: { type: String, default: null, index: true },

  // Trạng thái session
  status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE', index: true },

  // Requirement gốc khi tạo session — dùng để so sánh khi có requirement mới
  originalRequirements: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Requirement hiện tại (sau các lần refine)
  currentRequirements: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Tập package_id của toàn bộ candidates ban đầu (tìm từ full DB)
  candidatePackageIds: { type: [Number], default: [] },

  // Tập package_id đang được hiển thị / lọc trong lượt hiện tại
  currentCandidatePackageIds: { type: [Number], default: [] },

  // Số lần đã refine trên session này
  refinementCount: { type: Number, default: 0 }
}, {
  collection: 'chat_sessions',
  timestamps: true
});

chatSessionSchema.index({ sessionKey: 1, status: 1 });
chatSessionSchema.index({ userId: 1, status: 1 });
chatSessionSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
