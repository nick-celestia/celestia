const mongoose = require('mongoose');

// One document per player — always overwritten with their latest team.
// Expires 1 year after the last update (TTL index on updatedAt).
const teamSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },

    // The three shortIds exactly as stored in User.team
    slot1: { type: String, required: true },
    slot2: { type: String, required: true },
    slot3: { type: String, required: true },

    // Denormalised spirit data so battle can run without hitting UserSpirit again.
    // Each entry mirrors what loadTeam() returns after .populate('spirit').
    spirits: [
      {
        shortId: String,
        level: Number,
        spirit: {
          name: String,
          emoji: String,
          types: [String],
          baseStats: mongoose.Schema.Types.Mixed
        }
      }
    ]
  },
  {
    // updatedAt is maintained automatically by Mongoose.
    timestamps: true
  }
);

// TTL: MongoDB removes the document 365 days after updatedAt.
// The index is sparse so a missing updatedAt never causes issues.
teamSnapshotSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Exclude the snapshot owner from random picks.
teamSnapshotSchema.index({ userId: 1 });

module.exports =
  mongoose.models.TeamSnapshot || mongoose.model('TeamSnapshot', teamSnapshotSchema);
