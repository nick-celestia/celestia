const mongoose = require('mongoose');

const disabledCommandSchema = new mongoose.Schema({
  commandName: { type: String, required: true, unique: true, lowercase: true },
  disabledBy: { type: String, required: true },   // owner userId
  reason: { type: String, default: '' },
  disabledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.DisabledCommand || mongoose.model('DisabledCommand', disabledCommandSchema);
