const mongoose = require('mongoose');

const surveyHistorySchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: false,
    index: true
  },
  user_id: {
    type: Number,
    required: false,
    default: null,
    index: true
  },
  phone: {
    type: String,
    required: false,
    default: ''
  },
  full_name: {
    type: String,
    required: false,
    default: ''
  },
  source: {
    type: String,
    enum: ['user', 'guest'],
    default: 'guest'
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  recommendedPackages: {
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  isEarlyTerminated: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'survey_histories',
  timestamps: true
});

module.exports = mongoose.model('SurveyHistory', surveyHistorySchema);
