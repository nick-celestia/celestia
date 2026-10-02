const Log = require('../../models/Log');
const { getOrCreateUser } = require('../../services/userService');
const { mentionToId } = require('../../utils/args');
const { EmbedBuilder } = require('discord.js');

// c playerlogs @user             — last 20 logs for that player
// c playerlogs @user ban         — ban history only
// c playerlogs @user captcha     — captcha events only
// c playerlogs @user all         — last 50 logs across all types
// c playerlogs @user from=30d    — logs from the last 30 days

const TYPE_FILTERS = {
  ban:     ['permanent_ban', 'auto_temp_ban_ignored_captcha', 'manual_ban', 'manual_unban'],
  captcha: ['captcha_required', 'captcha_failed', 'captcha_passed', 'dm_captcha_sent'],
  abuse:   ['suspicious_activity', 'exploit_suspected', 'captcha_required',
            'auto_temp_ban_ignored_captcha', 'permanent_ban', 'manual_ban'],
  summon:  ['summon'],
  battle:  ['battle'],
};

function parseDaysArg(args) {
  const match = args.join(' ').match(/from=(\d+)d/i);
  return match ? parseInt(match[1]) : null;
}

module.exports = {
  name: 'playerlogs',
  aliases: ['plogs', 'userlogs'],
  description: 'View full log history for a player. Bot admin only.',
  botAdminOnly: true,

  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c playerlogs @user [ban|captcha|abuse|summon|battle|all] [from=30d]`');

    const user = await getOrCreateUser(userId);
    const filterKey = args[1]?.toLowerCase();
    const days = parseDaysArg(args);

    // Build query
    const query = { userId };

    if (filterKey && filterKey !== 'all' && TYPE_FILTERS[filterKey]) {
      query.type = { $in: TYPE_FILTERS[filterKey] };
    }

    if (days) {
      query.createdAt = { $gte: new Date(Date.now() - days * 86_400_000) };
    }

    const limit = filterKey === 'all' ? 50 : 20;
    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(limit);

    if (!logs.length) {
      return message.reply(`No logs found for <@${userId}>${filterKey ? ` (filter: ${filterKey})` : ''}${days ? ` in the last ${days} days` : ''}.`);
    }

    // Security summary from user doc
    const sec = user.security;
    const statusLines = [
      sec.permanentBan          ? '🔴 **PERMANENTLY BANNED**'                                           : null,
      sec.bannedUntil && new Date(sec.bannedUntil) > new Date()
                                ? `🟠 Temp banned until \`${sec.bannedUntil.toISOString()}\``           : null,
      sec.verificationRequired  ? `🟡 Verification required (reason: ${sec.verificationReason || '?'})` : null,
      `Captcha triggers: **${sec.captchaTriggerCount || 0}**`,
      `Captcha bans: **${sec.captchaBanCount || 0}**`,
      `Captcha failed attempts: **${sec.captchaFailedAttempts || 0}**`,
      `Wins: **${user.wins}** | Losses: **${user.losses}** | Streak: **${user.battleStreak}**`,
    ].filter(Boolean).join('\n');

    // Log lines — cap each at 120 chars so embed doesn't overflow
    const logLines = logs.map((l) => {
      const ts  = l.createdAt.toISOString().replace('T', ' ').slice(0, 19);
      const msg = l.message.length > 100 ? l.message.slice(0, 97) + '…' : l.message;
      return `\`${ts}\` **${l.type}** — ${msg}`;
    });

    // Split into chunks if needed (embed field limit 1024 chars)
    const chunks = [];
    let current  = '';
    for (const line of logLines) {
      if ((current + '\n' + line).length > 1000) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? current + '\n' + line : line;
      }
    }
    if (current) chunks.push(current);

    const embed = new EmbedBuilder()
      .setColor(sec.permanentBan ? 0xFF4444 : sec.bannedUntil ? 0xFF8C00 : 0x5DADE2)
      .setTitle(`📋 Player Logs — ${userId}`)
      .setDescription(statusLines)
      .setFooter({ text: `Showing ${logs.length} log(s)${filterKey ? ` · filter: ${filterKey}` : ''}${days ? ` · last ${days}d` : ''} · sorted newest first` });

    chunks.forEach((chunk, i) => {
      embed.addFields({ name: i === 0 ? 'Log History' : '​', value: chunk });
    });

    await message.reply({ embeds: [embed] });
  }
};
