const mongoose = require('mongoose');

const surveyOptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
  detail: { type: String },
  // Mapping defines the filter properties that this option adds to the query, e.g., { budgetMin: 0, budgetMax: 50000 } or { needTiktok: true }
  mapping: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const surveyConfigSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  field: { type: String, required: true, unique: true, index: true },
  component: { type: String, required: true, default: 'single-choice' }, // e.g., 'single-choice', 'multi-choice'
  order: { type: Number, required: true },
  multiple: { type: Boolean, default: false },
  options: [surveyOptionSchema]
}, {
  collection: 'survey_configs',
  timestamps: true
});

module.exports = mongoose.model('SurveyConfig', surveyConfigSchema);
