const { getGuildConfig } = require('../../services/guildService');

module.exports = {
  name: 'serverdisable',
  aliases: ['disablebot'],
  botAdminOnly: true,
  description: 'Admin: disable Celestia in this server.',
  async execute({ message, args }) {
    const config = await getGuildConfig(message.guild.id);
    config.disabled = true;
    config.disabledReason = args.join(' ') || 'Disabled by server admin.';
    await config.save();
    await message.reply(`🚫 Celestia disabled in this server. Use \`${config.prefix || 'c'} serverenable\` to enable again.`);
  }
};
