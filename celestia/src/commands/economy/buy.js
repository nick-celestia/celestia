const { buyItem } = require('../../services/itemService');
const { fmt } = require('../../utils/format');

module.exports = {
  name: 'buy',
  aliases: [],
  description: 'Buy shop item.',
  async execute({ message, args }) {
    const item = args.join('_');
    if (!item) return message.reply('Use: `c buy lucky_star`');
    const result = await buyItem(message.author.id, item);
    if (!result.ok) return message.reply(result.reason);
    await message.reply(`✅ Bought **${result.item.name}** for **${result.item.price} Mana**. Remaining Mana: **${fmt(result.user.mana)}**`);
  }
};
