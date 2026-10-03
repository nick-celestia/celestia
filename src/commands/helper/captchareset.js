const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { logEvent } = require('../../services/logService');

module.exports = {
  name: 'captchareset',
  aliases: ['resetcaptcha', 'clearcaptcha'],
  botAdminOnly: true,
  description: 'Bot Admin: clear captcha verification lock for a user.',
  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Use: `c captchareset @user`');

    const user = await getOrCreateUser(userId);
    user.security.verificationRequired = false;
    user.security.verificationReason = null;
    user.security.captchaIgnoredCommands = 0;
    user.security.captchaFailedAttempts = 0;
    user.security.verifiedAt = new Date();
    await user.save();

    await logEvent(client, {
      type: 'captcha_reset',
      userId,
      guildId: message.guild.id,
      message: `Captcha lock was reset by bot admin <@${message.author.id}>.`,
      data: { adminId: message.author.id }
    });

    return message.reply(`✅ Cleared captcha lock for <@${userId}>.`);
  }
};
