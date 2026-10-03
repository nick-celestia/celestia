const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const Log = require('../../models/Log');

function fmtDate(value) {
  return value ? new Date(value).toISOString() : 'Never';
}

module.exports = {
  name: 'checkabuse',
  aliases: ['abuse', 'checksecurity'],
  helperOnly: true,
  description: 'Helper: view recent Celestia security/game risk logs for a user.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Use: `c checkabuse @user`');

    const user = await getOrCreateUser(userId);
    const recentLogs = await Log.find({ userId }).sort({ createdAt: -1 }).limit(8);

    const s = user.security;
    const summary = [
      `User: <@${userId}>`,
      `Verification required: **${s.verificationRequired ? 'Yes' : 'No'}**`,
      `Ignored captcha commands: **${s.captchaIgnoredCommands || 0}/5**`,
      `Failed captcha attempts: **${s.captchaFailedAttempts || 0}**`,
      `Captcha triggers: **${s.captchaTriggerCount || 0}**`,
      `Captcha bans: **${s.captchaBanCount || 0}**`,
      `Temp ban until: ${fmtDate(s.bannedUntil)}`,
      `Permanent ban: **${s.permanentBan ? 'Yes' : 'No'}**`,
      `Ban reason: ${s.banReason || 'None'}`
    ];

    const logLines = recentLogs.length
      ? recentLogs.map((l) => `\`${l.createdAt.toISOString()}\` **${l.type}** — ${l.message}`)
      : ['No recent logs found for this user.'];

    return message.reply(`🛡️ **Security Summary**\n${summary.join('\n')}\n\n🧾 **Recent Logs**\n${logLines.join('\n')}`);
  }
};
