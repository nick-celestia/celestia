const mongoose = require('mongoose');

const spiritSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  emoji: { type: String, required: true },
  tier: { type: String, required: true, index: true },
  types: [{ type: String, required: true }],
  baseStats: {
    hp: { type: Number, required: true },
    atk: { type: Number, required: true },
    def: { type: Number, required: true },
    spd: { type: Number, required: true }
  },
  active: { type: Boolean, default: true, index: true },
  summonable: { type: Boolean, default: true, index: true },
  source: { type: String, default: 'official' },
  creatorId: { type: String, default: null },
  animatedEmoji: { type: Boolean, default: false },
  evolvesTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Spirit', default: null },
  isEvolvedForm: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Spirit', spiritSchema);
