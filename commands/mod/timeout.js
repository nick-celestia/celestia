const { EmbedBuilder } = require('discord.js');
const { mentionToId } = require('../../utils/args');
const { logEvent }    = require('../../services/logService');

// c timeout @user <duration> <reason>
// Duration format: 10m, 1h, 2h, 1d (max 28d — Discord limit)
// Examples:
//   c timeout @user 30m Spamming
//   c timeout @user 2h Harassment

function parseDuration(str) {
  const match = str?.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit  = match[2].toLowerCase();
  const ms    = unit === 'm' ? value * 60_000
              : unit === 'h' ? value * 3_600_000
              : unit === 'd' ? value * 86_400_000
              : null;
  // Discord max timeout = 28 days
  return ms && ms <= 28 * 86_400_000 ? ms : null;
}

function formatDuration(ms) {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '< 1m';
}

module.exports = {
  name: 'timeout',
  aliases: ['mute', 'tempmute'],
  helperOnly: true,
  description: 'Timeout a member. Use: c timeout @user <10m|1h|2h|1d> <reason>',

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c timeout @user <duration> <reason>`\nDuration: `10m`, `1h`, `6h`, `1d` (max 28d)');

    const ms = parseDuration(args[1]);
    if (!ms) return message.reply('Invalid duration. Use: `10m`, `1h`, `2h`, `1d` (max 28d)');

    const reason = args.slice(2).join(' ').trim() || 'No reason provided.';

    if (userId === message.author.id) return message.reply('You cannot timeout yourself.');
    if (userId === client.user.id)    return message.reply('I cannot timeout myself.');

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return message.reply('Member not found in this server.');

    if (!member.moderatable) {
      return message.reply('I cannot timeout this member — they may have a higher role than me.');
    }

    try {
      await member.timeout(ms, reason);
    } catch (err) {
      return message.reply(`❌ Failed to timeout: ${err.message}`);
    }

    await logEvent(client, {
      type:    'timeout',
      userId,
      guildId: message.guild?.id || null,
      message: `Timed out by <@${message.author.id}> for ${formatDuration(ms)}. Reason: ${reason}`,
      data:    { duration: ms, reason, issuedBy: message.author.id }
    });

    // DM the player
    try {
      const user = await client.users.fetch(userId);
      await user.send(
        `🔇 **You have been timed out in ${message.guild.name}.**\n\n` +
        `**Duration:** ${formatDuration(ms)}\n` +
        `**Reason:** ${reason}\n\n` +
        `You will be able to send messages again after the timeout expires.`
      );
    } catch { /* DMs off */ }

    const embed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle('🔇 Member Timed Out')
      .addFields(
        { name: 'Member',      value: `<@${userId}>`,            inline: true },
        { name: 'Duration',    value: formatDuration(ms),        inline: true },
        { name: 'By',          value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason',      value: reason,                    inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
