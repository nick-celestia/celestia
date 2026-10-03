const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { sendDmCaptcha } = require('../../services/imageCaptchaService');

// c dmcaptcha @user
// Sends a DM image captcha to a player who can't open the web captcha link.
// Player replies to the bot DM with the 6-character code to get verified.

module.exports = {
  name: 'dmcaptcha',
  aliases: ['sendcaptcha', 'captchadm'],
  description: 'Send a DM image captcha to a player. Bot admin only.',
  botAdminOnly: true,

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c dmcaptcha @user`');

    const user = await getOrCreateUser(userId);

    if (!user.security.verificationRequired) {
      return message.reply(
        `<@${userId}> does not currently have a pending verification — they can use Celestia normally.`
      );
    }

    const result = await sendDmCaptcha(
      client,
      userId,
      message.guild?.id || null,
      `staff:${message.author.id}`
    );

    if (!result.ok) {
      return message.reply(
        `❌ ${result.reason}\n` +
        `They may have DMs disabled. Ask them to open DMs from server members and try again.`
      );
    }

    await message.reply(
      `✅ Image captcha sent to <@${userId}> via DM.\n` +
      `They need to reply to the bot with the 6-character code within 5 minutes.\n` +
      `They have 3 attempts before the session expires.`
    );
  }
};
