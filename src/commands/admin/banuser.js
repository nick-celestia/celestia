const { EmbedBuilder }  = require('discord.js');
const { mentionToId }   = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { logEvent }      = require('../../services/logService');
const env               = require('../../config/env');

function parseDuration(text) {
  if (!text) return null;
  const match = text.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit  = match[2].toLowerCase();
  const mult  = unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return value * mult;
}

function formatDuration(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '< 1m';
}

module.exports = {
  name: 'banuser',
  aliases: ['botban'],
  botAdminOnly: true,
  description: 'Temp or permanently ban a player from Celestia.',

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    const durationRaw = args[1];

    if (!userId || !durationRaw) {
      return message.reply('Usage: `c banuser @user 7d reason` or `c banuser @user permanent reason`');
    }

    // ── Issue #16: Owner immune to ban ────────────────────────────────────────
    if (env.ownerIds.includes(userId)) {
      return message.reply('❌ The bot owner cannot be banned.');
    }

    const reason = args.slice(2).join(' ') || 'No reason provided.';
    const user   = await getOrCreateUser(userId);

    let durationText;
    let untilDate = null;

    if (durationRaw.toLowerCase() === 'permanent') {
      user.security.permanentBan = true;
      user.security.bannedUntil  = null;
      durationText = 'Permanently';
    } else {
      const ms = parseDuration(durationRaw);
      if (!ms) return message.reply('Duration must be like 30m, 12h, 7d, or permanent.');
      untilDate = new Date(Date.now() + ms);
      user.security.bannedUntil  = untilDate;
      user.security.permanentBan = false;
      durationText = formatDuration(ms);
    }

    user.security.banReason = reason;
    await user.save();

    await logEvent(client, {
      type:    'manual_ban',
      userId,
      guildId: message.guild?.id || null,
      message: `Banned by <@${message.author.id}> for ${durationText}. Reason: ${reason}`,
    });

    // ── Issue #17: DM the player about ban ────────────────────────────────────
    try {
      const discordUser = await client.users.fetch(userId);
      const untilText   = untilDate
        ? `Until: <t:${Math.floor(untilDate.getTime() / 1000)}:F> (<t:${Math.floor(untilDate.getTime() / 1000)}:R>)`
        : 'This ban is **permanent**.';

      const dmEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🚫 You have been banned from Celestia')
        .addFields(
          { name: 'Duration', value: durationText,  inline: true },
          { name: 'Reason',   value: reason,         inline: false },
          { name: 'Status',   value: untilText,      inline: false },
        )
        .setFooter({ text: 'To appeal, contact staff in the official Celestia server.' })
        .setTimestamp();

      await discordUser.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

    const embed = new EmbedBuilder()
      .setColor(0xFF4444)
      .setTitle('🚫 Player Banned')
      .addFields(
        { name: 'Player',   value: `<@${userId}>`,            inline: true },
        { name: 'Duration', value: durationText,              inline: true },
        { name: 'By',       value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason',   value: reason,                    inline: false },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
