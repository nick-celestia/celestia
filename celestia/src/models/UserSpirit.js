const mongoose = require('mongoose');

const userSpiritSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true },
  spirit: { type: mongoose.Schema.Types.ObjectId, ref: 'Spirit', required: true, index: true },
  shortId: { type: String, required: true, unique: true, index: true },
  nickname: { type: String, default: null },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  cosmeticTag: { type: String, default: null },
  aura: { type: String, default: null },
  obtainedBy: { type: String, default: 'summon' },
  equipment: {
    weapon:   { type: String, default: null },
    artifact: { type: String, default: null }  // for future
  },

  // Spirit Bond
  bondPoints: { type: Number, default: 0, min: 0, index: true },
  bondLevel: { type: Number, default: 1, min: 1, max: 100 },
  battlesTogether: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

userSpiritSchema.index({ ownerId: 1, bondPoints: -1 });

module.exports = mongoose.model('UserSpirit', userSpiritSchema);
