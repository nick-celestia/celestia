const { SHOP_ITEMS } = require('../../config/game');

module.exports = {
  name: 'shop',
  aliases: [],
  description: 'View Mana shop.',
  async execute({ message, prefix }) {
    const lines = Object.entries(SHOP_ITEMS).map(([key, item]) => `**${item.name}** — ${item.price} Mana\n\`${prefix} buy ${key}\` — ${item.description}`);
    await message.reply(`🛒 **Celestia Shop**\n\n${lines.join('\n\n')}`);
  }
};
