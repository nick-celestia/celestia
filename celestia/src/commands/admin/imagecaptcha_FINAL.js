const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { sendDmCaptcha } = require('../../services/imageCaptchaService');

// c imagecaptcha @user
// Sends a DM image captcha (drawn image with 6-char code) to a player
// who cannot open the web captcha link.
// Different from c sendcaptcha which sends a web link — this sends an image directly.
// botAdminOnly — helpers use c sendcaptcha for web links.

module.exports = {
  name: 'imagecaptcha',
  aliases: ['imgcaptcha', 'dmimage'],   // no 'dmcaptcha' — that alias is taken by sendcaptcha
  botAdminOnly: true,
  description: 'Send a DM image captcha to a player who cannot open the web link. Bot admin only.',

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply(
      'Usage: `c imagecaptcha @user`\n' +
      'This sends a drawn image captcha via DM — the player replies with the 6-character code.\n' +
      'Use `c sendcaptcha @user` to send a web link instead.'
    );

    const user = await getOrCreateUser(userId);

    if (!user.security.verificationRequired) {
      return message.reply(`<@${userId}> is not currently verification-locked — they can use Celestia normally.`);
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
        `They may have DMs disabled. Ask them to allow DMs from server members and try again.\n` +
        `Alternatively use \`c sendcaptcha @user\` to send a web captcha link instead.`
      );
    }

    await message.reply(
      `✅ Image captcha sent to <@${userId}> via DM.\n` +
      `They must reply to the bot with the **6-character code** within **5 minutes**.\n` +
      `They have **3 attempts** before the session expires.`
    );
  }
};
