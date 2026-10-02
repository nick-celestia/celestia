const { getGuildConfig } = require('../../services/guildService');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  adminOnly: true,
  description: 'Admin: set server prefix.',
  async execute({ message, args }) {
    const prefix = args[0];
    if (!prefix || prefix.length > 3) return message.reply('Use: `c setprefix !`');
    const config = await getGuildConfig(message.guild.id);
    config.prefix = prefix;
    await config.save();
    await message.reply(`✅ Prefix set to \`${prefix}\`.`);
  }
};
