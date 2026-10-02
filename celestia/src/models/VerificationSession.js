const mongoose = require('mongoose');

const verificationSessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  guildId: { type: String, default: null },
  reason: { type: String, default: 'Suspicious command activity' },
  expiresAt: { type: Date, required: true, index: true },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('VerificationSession', verificationSessionSchema);
