const mongoose = require('mongoose');

const compareHistorySchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: Number, default: null },
  guest_id: { type: String, default: null },
  is_guest: { type: Boolean, required: true },
  packages_compared: { type: [String], default: [] },
  final_packages: { type: [String], default: [] },
  selected_package: { type: String, default: null },
  compare_count: { type: Number, default: 0 },
  compare_duration: { type: Number, default: 0 }, // in seconds
  completed: { type: Boolean, default: false },
  cleared_by_user: { type: Boolean, default: false },
  status: { type: String, default: 'ACTIVE' }, // ACTIVE, COMPLETED, ABANDONED, CLEARED
  cleared_at: { type: Date, default: null },
  source: { type: String, default: 'compare' }
}, {
  collection: 'compare_histories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('CompareHistory', compareHistorySchema);
