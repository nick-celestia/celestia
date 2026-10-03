const { mentionToId } = require('../../utils/args');
const { createHelperCaptchaLink } = require('../../services/antiAbuseService');

module.exports = {
  name: 'sendcaptcha',
  aliases: ['resendcaptcha', 'dmcaptcha'],
  helperOnly: true,
  description: 'Helper: resend captcha link to a user who is already verification-locked.',
  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Use: `c sendcaptcha @user`');

    const result = await createHelperCaptchaLink(client, userId, message.guild.id, message.author.id);

    if (!result.ok && result.reason === 'not_required') {
      return message.reply(`✅ <@${userId}> is not currently verification-locked. No captcha link was sent.`);
    }

    if (!result.link) {
      return message.reply('Captcha is not fully configured. Check `CAPTCHA_ENABLED`, `PUBLIC_BASE_URL`, `HCAPTCHA_SITE_KEY`, and `HCAPTCHA_SECRET`.');
    }

    const user = await client.users.fetch(userId).catch(() => null);
    const dmText = `🌙 **Celestia Verification**\n\nYour account is currently locked by Celestia security verification.\nPlease solve this captcha to continue using Celestia:\n${result.link}`;
    const dmOk = user ? await user.send(dmText).then(() => true).catch(() => false) : false;

    if (dmOk) {
      return message.reply(`📩 Sent captcha link to <@${userId}> by DM.`);
    }

    return message.reply(`I could not DM <@${userId}>. Their DMs may be closed. Send them this link manually if appropriate:\n${result.link}`);
  }
};
