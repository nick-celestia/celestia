const { getOrCreateUser } = require('../../services/userService');
const { PREMIUM } = require('../../config/game');
const { timeLeft } = require('../../utils/format');

module.exports = {
  name: 'star',
  aliases: ['stars'],
  description: 'View STAR/custom status.',
  async execute({ message }) {
    const user = await getOrCreateUser(message.author.id);
    const access = user.premium.customAccessUntil && new Date(user.premium.customAccessUntil).getTime() > Date.now()
      ? timeLeft(user.premium.customAccessUntil)
      : 'not active';
    await message.reply(`🌟 **${PREMIUM.starDisplayName} Status**
Available STAR: **${user.premium.starsAvailable}**
Pending STAR: **${user.premium.starsPending}**
Custom summon access: **${access}**

Use \`c submitstar "Name" <emoji> <type> <hp> <atk> <def> <spd>\` to submit a Custom spirit.`);
  }
};
