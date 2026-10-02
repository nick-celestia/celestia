const { getGuildConfig } = require('../../services/guildService');

module.exports = {
  name: 'setlog',
  aliases: ['setlogs'],
  adminOnly: true,
  description: 'Admin: set current channel as Celestia log channel.',
  async execute({ message }) {
    const config = await getGuildConfig(message.guild.id);
    config.logChannelId = message.channel.id;
    await config.save();
    await message.reply('✅ This channel is now the Celestia log channel.');
  }
};
