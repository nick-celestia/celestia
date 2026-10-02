const { findOwnedSpirit } = require('../../services/spiritService');
const { getOrCreateUser } = require('../../services/userService');

module.exports = {
  name: 'rename',
  aliases: [],
  description: 'Use a Rename Scroll to rename a spirit.',
  async execute({ message, args }) {
    const id = args.shift();
    const newName = args.join(' ').trim();
    if (!id || !newName) return message.reply('Use: `c rename <spiritId> <new name>`');
    if (newName.length > 32) return message.reply('Name is too long. Max 32 characters.');

    const user = await getOrCreateUser(message.author.id);
    if ((user.items.rename_scroll || 0) < 1) return message.reply('You need a Rename Scroll. Buy one with `c buy rename_scroll`.');
    const owned = await findOwnedSpirit(message.author.id, id);
    if (!owned) return message.reply('Spirit not found.');

    user.items.rename_scroll -= 1;
    owned.nickname = newName;
    await user.save();
    await owned.save();
    await message.reply(`✅ Renamed spirit \`${owned.shortId}\` to **${newName}**.`);
  }
};
