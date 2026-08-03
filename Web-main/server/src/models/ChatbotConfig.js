const mongoose = require('mongoose');

const chatbotConfigSchema = new mongoose.Schema({
  systemPrompt: { type: String, required: true },
  trainingKeywords: [{
    keyword: { type: String, required: true },
    response: { type: String, required: true },
    suggestedPackageId: { type: String }
  }]
}, {
  collection: 'chatbot_configs',
  timestamps: true
});

module.exports = mongoose.model('ChatbotConfig', chatbotConfigSchema);
