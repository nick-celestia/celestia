const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
  userId:   { type: String, required: true, index: true },
  guildId:  { type: String, default: null },
  reason:   { type: String, required: true },
  issuedBy: { type: String, required: true },
  issuedAt: { type: Date,   default: Date.now }
});

warningSchema.index({ userId: 1, issuedAt: -1 });

module.exports = mongoose.models.Warning || mongoose.model('Warning', warningSchema);
