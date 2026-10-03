const { findOwnedSpirit } = require('../../services/spiritService');

module.exports = {
  name: 'lock',
  aliases: [],
  description: 'Lock a spirit to stop accidental selling.',
  async execute({ message, args }) {
    const owned = await findOwnedSpirit(message.author.id, args[0]);
    if (!owned) return message.reply('Spirit not found.');
    owned.locked = true;
    await owned.save();
    await message.reply(`🔒 Locked **${owned.nickname || owned.spirit.name}** \`${owned.shortId}\`.`);
  }
};
