const { EmbedBuilder }   = require('discord.js');
const { getOrCreateUser} = require('../../services/userService');
const { ECONOMY }        = require('../../config/game');
const { fmt }            = require('../../utils/format');
const { awardPlayerXp, PLAYER_XP } = require('../../services/playerLevelService');

// Fixed daily reset at 9:00 AM IST = 03:30 UTC for all players simultaneously
function todayResetUTC() {
  const now   = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 30, 0, 0));
  if (now < reset) reset.setUTCDate(reset.getUTCDate() - 1);
  return reset;
}

function nextResetUTC() {
  const today = todayResetUTC();
  const next  = new Date(today);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

module.exports = {
  name: 'daily',
  aliases: ['d'],
  description: 'Claim your daily Mana reward. Resets at 9:00 AM IST every day.',

  async execute({ message }) {
    const user  = await getOrCreateUser(message.author.id);
    const now   = new Date();
    const reset = todayResetUTC();
    const last  = user.daily?.lastClaimAt ? new Date(user.daily.lastClaimAt) : null;

    // Already claimed since today's reset
    if (last && last >= reset) {
      const next   = nextResetUTC();
      const nextTs = Math.floor(next.getTime() / 1000);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5DADE2)
            .setTitle('🌙 Already claimed today')
            .setDescription(`You already claimed your daily reward.\nNext reset: <t:${nextTs}:t> (<t:${nextTs}:R>)`)
            .setFooter({ text: 'Daily resets at 9:00 AM IST / 03:30 UTC' })
        ]
      });
    }

    // Check streak
    const yesterdayReset = new Date(reset);
    yesterdayReset.setUTCDate(yesterdayReset.getUTCDate() - 1);
    const missed = !last || last < yesterdayReset;

    if (!user.daily) user.daily = { streak: 0, lastClaimAt: null };

    if (missed && last) {
      user.daily.streak = 1;
    } else {
      user.daily.streak = (user.daily.streak || 0) + 1;
    }

    user.daily.lastClaimAt = now;
    user.mana = (user.mana || 0) + ECONOMY.dailyMana;
    await user.save();

    // Award player XP
    const xpResult = awardPlayerXp(user, 'daily');
    if (xpResult.granted) await user.save();

    // Build description — never pass empty string to setDescription
    const lines = [];
    if (user.daily.streak >= 30) lines.push('⭐ **30-day streak bonus!**');
    else if (user.daily.streak >= 7) lines.push('🔥 **7-day streak bonus!**');
    if (xpResult.leveled) lines.push(`🌟 **Level Up!** You reached Player Level **${xpResult.newLevel}**!`);

    const description  = lines.length > 0 ? lines.join('\n') : null;
    const nextTs       = Math.floor(nextResetUTC().getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle('🌙 Daily Reward Claimed!')
      .addFields(
        { name: '🔮 Mana Earned',  value: `**+${fmt(ECONOMY.dailyMana)}**`, inline: true },
        { name: '🔥 Daily Streak', value: `**${user.daily.streak}** days`,  inline: true },
        { name: '💰 Total Mana',   value: `**${fmt(user.mana)}**`,          inline: true },
      )
      .setFooter({ text: `Next reset at 9:00 AM IST` })
      .setTimestamp(nextResetUTC());

    // Only set description if there's actual content — fixes the crash
    if (description) embed.setDescription(description);

    return message.reply({ embeds: [embed] });
  }
};
