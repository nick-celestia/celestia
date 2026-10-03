const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  prefix: { type: String, default: null },
  logChannelId: { type: String, default: null },
  voteAnnouncementChannelId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  disabledCommandsByChannel: {
    type: Map,
    of: [String],
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
