const GuildConfig = require('../../models/GuildConfig');
function getChannelId(message, arg) { const mention = arg?.match(/^<#(\d+)>$/); if (mention) return mention[1]; if (arg && /^\d+$/.test(arg)) return arg; return message.channel.id; }
module.exports = {
  name: 'disabledcmds',
  aliases: ['disabledcommands', 'blockedcmds'],
  adminOnly: true,
  description: 'Server Admin: list disabled commands in a channel.',
  async execute({ message, args }) {
    const channelId = getChannelId(message, args[0]);
    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return message.reply('Channel not found.');
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    const disabled = config?.disabledCommandsByChannel?.get(channelId) || [];
    if (!disabled.length) return message.reply(`No commands are disabled in ${channel}.`);
    return message.reply(`🚫 Commands disabled in ${channel}:\n${disabled.map((cmd) => `• \`${cmd}\``).join('\n')}`);
  }
};
