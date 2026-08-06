const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  activity_id: { type: Number, default: null },
  user_id: { type: Number, default: null, index: true },
  session_id: { type: String, default: null, index: true },
  flow_type: {
    type: String,
    enum: [
      'SEARCH_SUBSCRIBE_DIRECT',
      'SEARCH_VIEW_SUBSCRIBE',
      'SEARCH_VIEW',
      'COMPARE_SUBSCRIBE',
      'VIEW_SUBSCRIBE',
      'VIEW_ONLY'
    ],
    default: 'VIEW_ONLY',
    index: true
  },
  source: {
    type: String,
    enum: ['search', 'detail', 'compare'],
    default: 'detail',
    index: true
  },
  action_type: { 
    type: String, 
    required: true,
    enum: ['VIEW_PACKAGE', 'SEARCH', 'COMPARE', 'SUBSCRIBE', 'RENEW', 'CANCEL', 'COMPARE_AND_SUBSCRIBE'],
    index: true 
  },
  package_id: { type: Number, default: null, index: true },
  search_keyword: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: true }
}, {
  collection: 'user_activities',
  timestamps: false
});

module.exports = mongoose.model('UserActivity', userActivitySchema, 'user_activities');
