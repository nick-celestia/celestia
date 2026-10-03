const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { fmt } = require('../../utils/format');

module.exports = {
  name: 'givemana',
  aliases: [],
  botAdminOnly: true,
  description: 'Admin: give Mana.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    const amount = Number(args[1]);
    if (!userId || !Number.isInteger(amount)) return message.reply('Use: `c givemana @user 1000`');
    const user = await getOrCreateUser(userId);
    user.mana += amount;
    if (user.mana < 0) user.mana = 0;
    await user.save();
    await message.reply(`✅ Updated <@${userId}> Mana by **${fmt(amount)}**. Balance: **${fmt(user.mana)}**`);
  }
};
