const { getGuildConfig } = require('../../services/guildService');

module.exports = {
  name: 'serverenable',
  aliases: ['enablebot'],
  botAdminOnly: true,
  description: 'Admin: enable Celestia in this server.',
  async execute({ message }) {
    const config = await getGuildConfig(message.guild.id);
    config.disabled = false;
    config.disabledReason = null;
    await config.save();
    await message.reply('✅ Celestia enabled in this server.');
  }
};
