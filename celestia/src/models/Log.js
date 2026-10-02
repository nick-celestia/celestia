const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  userId: { type: String, default: null, index: true },
  guildId: { type: String, default: null, index: true },
  message: { type: String, default: '' },
  data: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
