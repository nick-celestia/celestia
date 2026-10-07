const GuildConfig = require('../../models/GuildConfig');

// c setlog #channel   → set log channel
// c setlog off        → remove log channel (issue #10)

module.exports = {
  name: 'setlog',
  aliases: ['logchannel'],
  adminOnly: true,
  description: 'Set or unset the bot log channel.',

  async execute({ message, args }) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'off' || sub === 'disable' || sub === 'unset' || sub === 'remove') {
      await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { logChannelId: null },
        { upsert: true }
      );
      return message.reply('✅ Log channel removed. Critical logs will no longer be posted in this server.');
    }

    const channelMention = args[0];
    const channelId      = channelMention?.replace(/[<#>]/g, '');
    const channel        = channelId && message.guild.channels.cache.get(channelId);

    if (!channel) {
      return message.reply(
        'Usage:\n' +
        '`c setlog #channel` — set the log channel\n' +
        '`c setlog off` — remove the log channel'
      );
    }

    await GuildConfig.findOneAndUpdate(
      { guildId: message.guild.id },
      { logChannelId: channel.id },
      { upsert: true }
    );

    return message.reply(`✅ Log channel set to <#${channel.id}>.\nCritical security alerts will appear there.`);
  }
};
