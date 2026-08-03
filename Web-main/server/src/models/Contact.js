const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  contact_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: Number, default: null },
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  topic: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['NEW', 'DONE'],
    default: 'NEW'
  },
  source: {
    type: String,
    enum: ['guest', 'user'],
    default: 'guest'
  },
  admin_note: { type: String, default: "" },
  handled_at: { type: Date, default: null },
  handled_by: { type: Number, default: null },
  is_deleted_by_user: { type: Boolean, default: false },
  deleted_at_by_user: { type: Date, default: null }
}, {
  collection: 'contacts',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Contact', contactSchema);
