const UserSpirit = require('../../models/UserSpirit');
const { spiritDisplay } = require('../../services/spiritService');

module.exports = {
  name: 'inv',
  aliases: ['inventory'],
  description: 'Show your spirits.',
  async execute({ message }) {
    const spirits = await UserSpirit.find({ ownerId: message.author.id }).sort({ createdAt: -1 }).limit(20).populate('spirit');
    if (!spirits.length) return message.reply('You do not own any spirits yet. Use `c s` to summon.');
    const lines = spirits.map(spiritDisplay);
    await message.reply(`📜 **Your latest spirits**\n${lines.join('\n')}\n\nShowing latest 20 spirits.`);
  }
};
