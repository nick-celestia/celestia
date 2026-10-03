const Giveaway = require('../../models/Giveaway');
const { endGiveaway } = require('../../services/giveawayService');

// c gend <messageId>   — end a specific giveaway early
// c gend               — ends the most recent active giveaway in this guild

module.exports = {
  name: 'gend',
  aliases: ['giveawayend'],
  description: 'End a giveaway early. Admin only.',
  adminOnly: true,

  async execute({ client, message, args }) {
    let giveaway;

    if (args[0]) {
      giveaway = await Giveaway.findOne({
        guildId: message.guild.id,
        messageId: args[0],
        ended: false
      });
      if (!giveaway) return message.reply('❌ No active giveaway found with that message ID.');
    } else {
      // Most recently created active giveaway in this guild
      giveaway = await Giveaway.findOne({ guildId: message.guild.id, ended: false })
        .sort({ createdAt: -1 });
      if (!giveaway) return message.reply('❌ No active giveaways in this server.');
    }

    await endGiveaway(client, giveaway);
    await message.reply(`✅ Giveaway for **${giveaway.prize}** ended.`).then(m => {
      setTimeout(() => m.delete().catch(() => null), 5000);
    });
    await message.delete().catch(() => null);
  }
};
