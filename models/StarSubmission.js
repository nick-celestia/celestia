const mongoose = require('mongoose');

const starSubmissionSchema = new mongoose.Schema({
  submitterId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  emoji: { type: String, required: true },
  tier: { type: String, default: 'Custom' },
  types: [{ type: String, required: true }],
  baseStats: {
    hp: Number,
    atk: Number,
    def: Number,
    spd: Number
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reason: { type: String, default: null },
  reviewedBy: { type: String, default: null },
  spiritId: { type: mongoose.Schema.Types.ObjectId, ref: 'Spirit', default: null }
}, { timestamps: true });

module.exports = mongoose.model('StarSubmission', starSubmissionSchema);
