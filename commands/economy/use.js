const { useItem } = require('../../services/itemService');

module.exports = {
  name: 'use',
  aliases: [],
  description: 'Use an item.',
  async execute({ message, args }) {
    const item = args.join('_');
    if (!item) return message.reply('Use: `c use lucky_star` or `c use battle_charm`');
    const result = await useItem(message.author.id, item);
    if (!result.ok) return message.reply(result.reason);
    await message.reply(result.message);
  }
};
