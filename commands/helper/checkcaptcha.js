const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const VerificationSession = require('../../models/VerificationSession');

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function fmtDate(value) {
  return value ? new Date(value).toISOString() : 'Never';
}

module.exports = {
  name: 'checkcaptcha',
  aliases: ['captcha', 'checkverify'],
  helperOnly: true,
  description: 'Helper: check a user captcha/security verification status.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Use: `c checkcaptcha @user`');

    const user = await getOrCreateUser(userId);
    const activeSessions = await VerificationSession.countDocuments({
      userId,
      completedAt: null,
      expiresAt: { $gt: new Date() }
    });

    const s = user.security;
    const lines = [
      `User: <@${userId}>`,
      `Verification required: **${yesNo(s.verificationRequired)}**`,
      `Reason: ${s.verificationReason || 'None'}`,
      `Ignored captcha commands: **${s.captchaIgnoredCommands || 0}/5**`,
      `Failed captcha attempts: **${s.captchaFailedAttempts || 0}**`,
      `Captcha trigger count: **${s.captchaTriggerCount || 0}**`,
      `Captcha ban count: **${s.captchaBanCount || 0}**`,
      `Active verification links: **${activeSessions}**`,
      `Last captcha triggered: ${fmtDate(s.lastCaptchaTriggeredAt)}`,
      `Last captcha failed: ${fmtDate(s.lastCaptchaFailedAt)}`,
      `Last captcha solved: ${fmtDate(s.verifiedAt)}`,
      `Current temp ban until: ${fmtDate(s.bannedUntil)}`,
      `Permanent ban: **${yesNo(s.permanentBan)}**`
    ];

    return message.reply(`🛡️ **Captcha/Security Status**\n${lines.join('\n')}`);
  }
};
