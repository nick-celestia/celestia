const GuildConfig = require('../../models/GuildConfig');
const { logEvent } = require('../../services/logService');

const PROTECTED_COMMANDS = new Set(['enablecmd','disablecmd','disabledcmds','setprefix','setlog','help','policies','policy','terms','privacy','accept','ping']);
function getChannelId(message, arg) { const mention = arg?.match(/^<#(\d+)>$/); if (mention) return mention[1]; if (arg && /^\d+$/.test(arg)) return arg; return message.channel.id; }
function resolveCommandName(client, raw) { const name = String(raw || '').toLowerCase().trim(); if (!name) return null; if (client.commands.has(name)) return name; return client.aliases?.get(name) || null; }

module.exports = {
  name: 'disablecmd',
  aliases: ['disablecommand', 'blockcmd'],
  adminOnly: true,
  description: 'Server Admin: disable a command in a specific channel.',
  async execute({ client, message, args }) {
    const commandName = resolveCommandName(client, args[0]);
    if (!commandName) return message.reply('Use: `c disablecmd <command> [#channel]`\nExample: `c disablecmd roll #general`');
    if (PROTECTED_COMMANDS.has(commandName)) return message.reply('That command is protected and cannot be disabled in channels.');
    const channelId = getChannelId(message, args[1]);
    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return message.reply('Channel not found.');
    const config = await GuildConfig.findOneAndUpdate({ guildId: message.guild.id }, { $setOnInsert: { guildId: message.guild.id } }, { upsert: true, new: true });
    const current = config.disabledCommandsByChannel?.get(channelId) || [];
    if (current.includes(commandName)) return message.reply(`\`${commandName}\` is already disabled in ${channel}.`);
    current.push(commandName);
    config.disabledCommandsByChannel.set(channelId, current);
    await config.save();
    await logEvent(client, { type: 'command_disabled_in_channel', userId: message.author.id, guildId: message.guild.id, message: `Disabled command ${commandName} in #${channel.name}.`, data: { commandName, channelId } });
    return message.reply(`✅ Disabled \`${commandName}\` in ${channel}.`);
  }
};
