const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');

module.exports = {
  name: 'unbanuser',
  aliases: ['botunban'],
  botAdminOnly: true,
  description: 'Admin: remove bot ban.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Use: `c unbanuser @user`');
    const user = await getOrCreateUser(userId);
    user.security.permanentBan = false;
    user.security.bannedUntil = null;
    user.security.banReason = null;
    await user.save();
    await message.reply(`✅ Unbanned <@${userId}> from Celestia.`);
  }
};
