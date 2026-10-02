const mongoose = require('mongoose');

// Tracks message activity per user in the official server only.
// Weekly counts reset every Monday 00:00 UTC via the scheduler.
// Total count is permanent and never shown publicly.
// Bot commands are never counted — only real chat messages.

const messageActivitySchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true },

  // Weekly counter — reset every Monday
  weeklyCount:  { type: Number, default: 0 },
  weekStart:    { type: Date,   default: () => currentWeekStart() },

  // Permanent total — never resets
  totalCount:   { type: Number, default: 0 },

  // Which permanent milestone roles this user has already received
  // so we don't assign the same role twice
  earnedMilestones: [{ type: String }],  // array of milestone keys e.g. ['milestone_500']
}, { timestamps: true });

messageActivitySchema.index({ weeklyCount: -1 });
messageActivitySchema.index({ totalCount:  -1 });

function currentWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon
  const diff = (day === 0 ? -6 : 1 - day); // offset to Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday;
}

module.exports = mongoose.models.MessageActivity
  || mongoose.model('MessageActivity', messageActivitySchema);
