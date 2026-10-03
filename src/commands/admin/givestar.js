const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');

module.exports = {
  name: 'givestar',
  aliases: [],
  botAdminOnly: true,
  description: 'Admin: give STAR after manual payment verification.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    const amount = Number(args[1] || 1);
    if (!userId || !Number.isInteger(amount) || amount < 1) return message.reply('Use: `c givestar @user 1`');
    const user = await getOrCreateUser(userId);
    user.premium.starsAvailable += amount;
    await user.save();
    await message.reply(`✅ Gave <@${userId}> **${amount} STAR**.`);
  }
};
