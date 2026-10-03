const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId:     { type: String, required: true, index: true },
  channelId:   { type: String, required: true },
  messageId:   { type: String, default: null },          // filled after message is sent
  hostedBy:    { type: String, required: true },          // userId who ran the command
  prize:       { type: String, required: true },
  winnerCount: { type: Number, default: 1 },
  endsAt:      { type: Date,   required: true },
  ended:       { type: Boolean, default: false },
  participants: [{ type: String }],                       // array of userIds
  winners:     [{ type: String }],                        // array of userIds, filled on end
}, { timestamps: true });

module.exports = mongoose.models.Giveaway || mongoose.model('Giveaway', giveawaySchema);
