const { mentionToId } = require('../../utils/args');
const { requireVerification } = require('../../services/antiAbuseService');

module.exports = {
  name: 'verifyuser',
  aliases: ['captchauser'],
  botAdminOnly: true,
  description: 'Admin: force user captcha verification.',
  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    const reason = args.slice(1).join(' ') || 'Manual admin verification required.';
    if (!userId) return message.reply('Use: `c verifyuser @user reason`');
    const link = await requireVerification(client, userId, message.guild.id, reason);
    await message.reply(link ? `🛡️ Verification required for <@${userId}>: ${link}` : `🛡️ Verification required for <@${userId}>. Captcha is not configured yet.`);
  }
};
