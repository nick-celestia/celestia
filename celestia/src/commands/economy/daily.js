const { getOrCreateUser } = require('../../services/userService');
const { ECONOMY } = require('../../config/game');
const { fmt } = require('../../utils/format');
const { awardPlayerXp, PLAYER_XP } = require('../../services/playerLevelService');

module.exports = {
  name: 'daily',
  aliases: ['d'],
  description: 'Claim 100 Mana every 24 hours and build daily streak.',
  async execute({ message }) {
    const user = await getOrCreateUser(message.author.id);
    const now = Date.now();
    const last = user.daily.lastClaimAt ? new Date(user.daily.lastClaimAt).getTime() : 0;
    const dayMs = 24 * 60 * 60 * 1000;

    if (last && now - last < dayMs) {
      const remaining = dayMs - (now - last);
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.ceil((remaining % 3600000) / 60000);
      return message.reply(`🌙 You already claimed daily. Come back in **${hours}h ${mins}m**.`);
    }

    const missed = last && now - last > 48 * 60 * 60 * 1000;
    user.daily.streak = missed ? 1 : user.daily.streak + 1;
    user.daily.lastClaimAt = new Date();
    user.mana += ECONOMY.dailyMana;
    await user.save();

    const xpResult = awardPlayerXp(user, 'daily');
  if (xpResult.granted) {
    await user.save();
    if (xpResult.leveled) {
      // Optional: append level-up note to the daily reply
      // levelUpText = `\n🌟 **Level Up!** You reached Player Level **${xpResult.newLevel}**!`;
    }
  }

    await message.reply(`🌙 **Daily claimed!**
You received **${ECONOMY.dailyMana} Mana**.
Daily streak: **${fmt(user.daily.streak)}** days
Total Mana: **${fmt(user.mana)}**`);
  }
};
