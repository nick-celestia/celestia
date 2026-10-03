const GuildConfig = require('../../models/GuildConfig');
const { logEvent } = require('../../services/logService');
function getChannelId(message, arg) { const mention = arg?.match(/^<#(\d+)>$/); if (mention) return mention[1]; if (arg && /^\d+$/.test(arg)) return arg; return message.channel.id; }
function resolveCommandName(client, raw) { const name = String(raw || '').toLowerCase().trim(); if (!name) return null; if (client.commands.has(name)) return name; return client.aliases?.get(name) || null; }
module.exports = {
  name: 'enablecmd',
  aliases: ['enablecommand', 'unblockcmd'],
  adminOnly: true,
  description: 'Server Admin: enable a command in a specific channel.',
  async execute({ client, message, args }) {
    const commandName = resolveCommandName(client, args[0]);
    if (!commandName) return message.reply('Use: `c enablecmd <command> [#channel]`\nExample: `c enablecmd roll #general`');
    const channelId = getChannelId(message, args[1]);
    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return message.reply('Channel not found.');
    const config = await GuildConfig.findOneAndUpdate({ guildId: message.guild.id }, { $setOnInsert: { guildId: message.guild.id } }, { upsert: true, new: true });
    const current = config.disabledCommandsByChannel?.get(channelId) || [];
    if (!current.includes(commandName)) return message.reply(`\`${commandName}\` is not disabled in ${channel}.`);
    const next = current.filter((cmd) => cmd !== commandName);
    if (next.length) config.disabledCommandsByChannel.set(channelId, next); else config.disabledCommandsByChannel.delete(channelId);
    await config.save();
    await logEvent(client, { type: 'command_enabled_in_channel', userId: message.author.id, guildId: message.guild.id, message: `Enabled command ${commandName} in #${channel.name}.`, data: { commandName, channelId } });
    return message.reply(`✅ Enabled \`${commandName}\` in ${channel}.`);
  }
};
