const { EmbedBuilder } = require('discord.js');
const Log = require('../../models/Log');
const { getOrCreateUser } = require('../../services/userService');
const { mentionToId } = require('../../utils/args');

// c playerprofile @user
// Full deep security + gameplay profile. Bot admin only.
// Helpers should use c checkabuse for the lighter summary view.

module.exports = {
  name: 'playerprofile',
  aliases: ['pp', 'pprofile', 'checkuser'],
  botAdminOnly: true,
  description: 'Full security + gameplay profile for a player. Bot admin only.',

  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c playerprofile @user`\nTip: helpers can use `c checkabuse @user` for a quick security summary.');

    const user = await getOrCreateUser(userId);
    const sec  = user.security;

    const [recentBans, recentCaptchas, recentAbuse, totalLogs] = await Promise.all([
      Log.find({ userId, type: { $in: ['permanent_ban','auto_temp_ban_ignored_captcha','manual_ban','manual_unban'] } })
         .sort({ createdAt: -1 }).limit(5),
      Log.find({ userId, type: { $in: ['captcha_required','captcha_failed','captcha_passed','dm_captcha_sent','captcha_reset'] } })
         .sort({ createdAt: -1 }).limit(5),
      Log.find({ userId, type: { $in: ['suspicious_activity','exploit_suspected'] } })
         .sort({ createdAt: -1 }).limit(5),
      Log.countDocuments({ userId })
    ]);

    let statusBadge = '🟢 Active';
    let embedColor  = 0x2ECC71;
    if (sec.permanentBan) {
      statusBadge = '🔴 Permanently Banned';
      embedColor  = 0xFF4444;
    } else if (sec.bannedUntil && new Date(sec.bannedUntil) > new Date()) {
      statusBadge = `🟠 Temp Banned until ${new Date(sec.bannedUntil).toISOString().slice(0,10)}`;
      embedColor  = 0xFF8C00;
    } else if (sec.verificationRequired) {
      statusBadge = '🟡 Awaiting Captcha';
      embedColor  = 0xF1C40F;
    }

    const createdAt = user.createdAt ? user.createdAt.toISOString().slice(0,10) : 'Unknown';

    function fmtLogs(logs) {
      if (!logs.length) return 'None';
      return logs.map(l => {
        const date = l.createdAt.toISOString().slice(0,10);
        const msg  = l.message.slice(0, 80);
        return `\`${date}\` **${l.type}** — ${msg}`;
      }).join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🔍 Player Profile — ${userId}`)
      .addFields(
        {
          name: '📊 Status',
          value: [
            `**Status:** ${statusBadge}`,
            `**Account created:** ${createdAt}`,
            `**Total log entries:** ${totalLogs}`,
            sec.banReason          ? `**Ban reason:** ${sec.banReason}`                   : null,
            sec.verificationReason ? `**Captcha reason:** ${sec.verificationReason}`      : null,
          ].filter(Boolean).join('\n'),
          inline: false
        },
        {
          name: '🛡️ Security Counters',
          value: [
            `Captcha triggers: **${sec.captchaTriggerCount || 0}**`,
            `Captcha fails: **${sec.captchaFailedAttempts || 0}**`,
            `Captcha bans: **${sec.captchaBanCount || 0}**`,
            `Commands blocked (captcha ignored): **${sec.captchaIgnoredCommands || 0}**`,
          ].join('\n'),
          inline: true
        },
        {
          name: '🎮 Gameplay Stats',
          value: [
            `Wins: **${user.wins}** | Losses: **${user.losses}**`,
            `Battle streak: **${user.battleStreak}** (best: **${user.bestBattleStreak}**)`,
            `Mana: **${user.mana}**`,
          ].join('\n'),
          inline: true
        },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '🚫 Recent Bans',          value: fmtLogs(recentBans),     inline: false },
        { name: '🔐 Recent Captcha Events', value: fmtLogs(recentCaptchas), inline: false },
        { name: '⚠️ Recent Abuse Flags',   value: fmtLogs(recentAbuse),    inline: false },
      )
      .setFooter({ text: 'c playerlogs @user — full history  •  c deletelogs @user — purge logs  •  c checkabuse @user — helper view' });

    await message.reply({ embeds: [embed] });
  }
};
