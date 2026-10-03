const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');

const allowed = ['lucky_star', 'battle_charm', 'rename_scroll', 'celestial_stone'];

module.exports = {
  name: 'giveitem',
  aliases: [],
  botAdminOnly: true,
  description: 'Admin: give item.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    const item = args[1];
    const amount = Number(args[2] || 1);
    if (!userId || !allowed.includes(item) || !Number.isInteger(amount)) {
      return message.reply(`Use: \`c giveitem @user <${allowed.join('|')}> <amount>\``);
    }
    const user = await getOrCreateUser(userId);
    user.items[item] = (user.items[item] || 0) + amount;
    await user.save();
    await message.reply(`✅ Gave <@${userId}> **${amount} ${item}**.`);
  }
};
