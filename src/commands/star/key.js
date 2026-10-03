const { getOrCreateUser } = require('../../services/userService');
const { PREMIUM } = require('../../config/game');

module.exports = {
  name: 'key',
  aliases: ['constellation', 'constellationkey', 'customaccess'],
  description: 'Check your Custom summon access status.',
  async execute({ message }) {
    const user = await getOrCreateUser(message.author.id);
    const until = user.premium.customAccessUntil ? new Date(user.premium.customAccessUntil) : null;
    const active = until && until.getTime() > Date.now();

    if (!active) {
      return message.reply(`🌌 **${PREMIUM.customAccessDisplayName}**\nStatus: Not active\nCustom spirits are locked from your summon pool. Purchase/access can be granted by staff.`);
    }

    const msLeft = until.getTime() - Date.now();
    const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    return message.reply(`🌌 **${PREMIUM.customAccessDisplayName}**\nStatus: Active\nExpires: ${until.toISOString()}\nApprox days left: ${days}`);
  }
};
