const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { PREMIUM } = require('../../config/game');

module.exports = {
  name: 'grantkey',
  aliases: ['grantaccess'],
  botAdminOnly: true,
  description: 'Admin: grant Custom summon access days.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    const days = Number(args[1] || PREMIUM.customAccessDays);
    if (!userId || !Number.isFinite(days) || days <= 0) return message.reply('Use: `c grantkey @user 30`');
    const user = await getOrCreateUser(userId);
    const base = user.premium.customAccessUntil && new Date(user.premium.customAccessUntil).getTime() > Date.now()
      ? new Date(user.premium.customAccessUntil).getTime()
      : Date.now();
    user.premium.customAccessUntil = new Date(base + days * 24 * 60 * 60 * 1000);
    await user.save();
    await message.reply(`✅ Granted <@${userId}> Custom summon access for **${days} days**.`);
  }
};
