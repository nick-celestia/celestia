const { EmbedBuilder }    = require('discord.js');
const Log                 = require('../../models/Log');
const { getOrCreateUser } = require('../../services/userService');
const { mentionToId }     = require('../../utils/args');

module.exports = {
  name: 'playerprofile',
  aliases: ['pp', 'pprofile', 'checkuser'],
  botAdminOnly: true,
  description: 'Full security + gameplay profile for a player.',

  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c playerprofile @user`');

    const user = await getOrCreateUser(userId);
    const sec  = user.security;

    // ── Issue #6: Show registration status ────────────────────────────────────
    const isRegistered = Boolean(user.legal?.termsAcceptedAt);
    const registrationLine = isRegistered
      ? `✅ Registered on <t:${Math.floor(new Date(user.legal.termsAcceptedAt).getTime() / 1000)}:D>`
      : `❌ **Not registered** — has not used \`c accept\` yet`;

    const [recentBans, recentCaptchas, recentAbuse, totalLogs] = await Promise.all([
      Log.find({ userId, type: { $in: ['permanent_ban','auto_temp_ban_ignored_captcha','manual_ban','manual_unban'] } }).sort({ createdAt: -1 }).limit(5),
      Log.find({ userId, type: { $in: ['captcha_required','captcha_failed','captcha_passed','dm_captcha_sent','captcha_solved'] } }).sort({ createdAt: -1 }).limit(5),
      Log.find({ userId, type: { $in: ['suspicious_activity','exploit_suspected'] } }).sort({ createdAt: -1 }).limit(5),
      Log.countDocuments({ userId }),
    ]);

    let statusBadge = '🟢 Active';
    let embedColor  = 0x2ECC71;
    if (!isRegistered) {
      statusBadge = '⚪ Unregistered';
      embedColor  = 0x888888;
    }
    if (sec.permanentBan) { statusBadge = '🔴 Permanently Banned'; embedColor = 0xFF4444; }
    else if (sec.bannedUntil && new Date(sec.bannedUntil) > new Date()) {
      // Issue #15: Discord timestamp for ban expiry
      const banTs = Math.floor(new Date(sec.bannedUntil).getTime() / 1000);
      statusBadge = `🟠 Temp Banned until <t:${banTs}:F> (<t:${banTs}:R>)`;
      embedColor  = 0xFF8C00;
    }
    else if (sec.verificationRequired) { statusBadge = '🟡 Awaiting Captcha'; embedColor = 0xF1C40F; }

    function fmtLogs(logs) {
      if (!logs.length) return 'None';
      return logs.map(l => {
        // Issue #15: UTC timestamp in logs
        const ts  = new Date(l.createdAt);
        const utc = `${ts.toISOString().slice(0,10)} ${ts.getUTCHours().toString().padStart(2,'0')}:${ts.getUTCMinutes().toString().padStart(2,'0')} UTC`;
        return `\`${utc}\` **${l.type}** — ${l.message?.slice(0,60) || ''}`;
      }).join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🔍 Player Profile — ${userId}`)
      .addFields(
        { name: '📊 Status', value: [
          `**Status:** ${statusBadge}`,
          `**Registration:** ${registrationLine}`,
          `**Total logs:** ${totalLogs}`,
          sec.banReason          ? `**Ban reason:** ${sec.banReason}` : null,
          sec.verificationReason ? `**Captcha reason:** ${sec.verificationReason}` : null,
        ].filter(Boolean).join('\n'), inline: false },
        { name: '🛡️ Security', value: [
          `Captcha triggers: **${sec.captchaTriggerCount || 0}**`,
          `Captcha fails: **${sec.captchaFailedAttempts || 0}**`,
          `Captcha bans: **${sec.captchaBanCount || 0}**`,
        ].join('\n'), inline: true },
        { name: '🎮 Gameplay', value: [
          `Wins: **${user.wins}** | Losses: **${user.losses}**`,
          `Streak: **${user.battleStreak}** (best: **${user.bestBattleStreak}**)`,
          `Mana: **${user.mana}**`,
        ].join('\n'), inline: true },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '🚫 Recent Bans',          value: fmtLogs(recentBans),     inline: false },
        { name: '🔐 Recent Captcha',        value: fmtLogs(recentCaptchas), inline: false },
        { name: '⚠️ Recent Abuse',          value: fmtLogs(recentAbuse),    inline: false },
      )
      .setFooter({ text: 'c playerlogs @user — full history • Timestamps in UTC' });

    await message.reply({ embeds: [embed] });
  }
};
