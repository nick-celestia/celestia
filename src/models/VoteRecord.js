const mongoose = require('mongoose');

const voteRecordSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  votedAt:   { type: Date,   default: Date.now, index: true },
  source:    { type: String, default: 'topgg' },  // future-proofed for other lists
  weekend:   { type: Boolean, default: false },    // top.gg doubles points on weekends
});

// Compound index for fast monthly queries per user
voteRecordSchema.index({ userId: 1, votedAt: -1 });

module.exports = mongoose.models.VoteRecord || mongoose.model('VoteRecord', voteRecordSchema);
