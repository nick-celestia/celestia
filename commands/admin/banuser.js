const { mentionToId } = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');

function parseDuration(text) {
  if (!text) return null;
  const match = text.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult = unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return value * mult;
}

module.exports = {
  name: 'banuser',
  aliases: ['botban'],
  botAdminOnly: true,
  description: 'Admin: temp/permanent bot ban user.',
  async execute({ message, args }) {
    const userId = mentionToId(args[0]);
    const durationRaw = args[1];
    if (!userId || !durationRaw) return message.reply('Use: `c banuser @user 7d reason` or `c banuser @user permanent reason`');
    const reason = args.slice(2).join(' ') || 'No reason provided.';
    const user = await getOrCreateUser(userId);
    if (durationRaw.toLowerCase() === 'permanent') {
      user.security.permanentBan = true;
      user.security.bannedUntil = null;
    } else {
      const ms = parseDuration(durationRaw);
      if (!ms) return message.reply('Duration must be like 30m, 12h, 7d, or permanent.');
      user.security.bannedUntil = new Date(Date.now() + ms);
    }
    user.security.banReason = reason;
    await user.save();
    await message.reply(`🚫 Bot-banned <@${userId}>. Reason: ${reason}`);
  }
};
