const { findOwnedSpirit } = require('../../services/spiritService');

module.exports = {
  name: 'unlock',
  aliases: [],
  description: 'Unlock a spirit.',
  async execute({ message, args }) {
    const owned = await findOwnedSpirit(message.author.id, args[0]);
    if (!owned) return message.reply('Spirit not found.');
    owned.locked = false;
    await owned.save();
    await message.reply(`🔓 Unlocked **${owned.nickname || owned.spirit.name}** \`${owned.shortId}\`.`);
  }
};
