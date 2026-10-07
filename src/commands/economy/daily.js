const { EmbedBuilder }   = require('discord.js');
const { getOrCreateUser} = require('../../services/userService');
const { ECONOMY }        = require('../../config/game');
const { fmt }            = require('../../utils/format');
const { awardPlayerXp, PLAYER_XP } = require('../../services/playerLevelService');

// ── Issue #11: Fixed daily reset at 9:00 AM IST = 03:30 UTC ─────────────────
// Instead of "24h from last claim", resets at a fixed UTC time each day.
// This means all players reset together — no one has an advantage by claiming
// at odd hours to shift their window.

function todayResetUTC() {
  const now = new Date();
  // 03:30 UTC = 09:00 IST
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 30, 0, 0));
  // If today's reset hasn't happened yet, use yesterday's reset
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
    const last  = user.daily.lastClaimAt ? new Date(user.daily.lastClaimAt) : null;

    // Already claimed since today's reset
    if (last && last >= reset) {
      const next      = nextResetUTC();
      const nextTs    = Math.floor(next.getTime() / 1000);
      const embed = new EmbedBuilder()
        .setColor(0x5DADE2)
        .setTitle('🌙 Already claimed today')
        .setDescription(`You already claimed your daily reward.\nCome back at <t:${nextTs}:t> (<t:${nextTs}:R>).`)
        .setFooter({ text: 'Daily resets at 9:00 AM IST / 03:30 UTC' });
      return message.reply({ embeds: [embed] });
    }

    // Check streak — missed if last claim was before yesterday's reset
    const yesterdayReset = new Date(reset);
    yesterdayReset.setUTCDate(yesterdayReset.getUTCDate() - 1);
    const missed = !last || last < yesterdayReset;

    if (missed && last) {
      user.daily.streak = 1;
    } else {
      user.daily.streak = (user.daily.streak || 0) + 1;
    }

    user.daily.lastClaimAt = now;
    user.mana += ECONOMY.dailyMana;
    await user.save();

    // Award player XP
    const xpResult = awardPlayerXp(user, 'daily');
    if (xpResult.granted) await user.save();

    const streakBonus  = user.daily.streak >= 7  ? '🔥 7-day streak bonus!' :
                         user.daily.streak >= 30 ? '⭐ 30-day streak bonus!' : '';
    const nextTs       = Math.floor(nextResetUTC().getTime() / 1000);
    const levelUpLine  = xpResult.leveled ? `\n🌟 **Level Up!** You reached Player Level **${xpResult.newLevel}**!` : '';

    const embed = new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle('🌙 Daily Reward Claimed!')
      .addFields(
        { name: '🔮 Mana Earned',  value: `**+${fmt(ECONOMY.dailyMana)}**`,    inline: true },
        { name: '🔥 Daily Streak', value: `**${user.daily.streak}** days`,     inline: true },
        { name: '💰 Total Mana',   value: `**${fmt(user.mana)}**`,             inline: true },
      )
      .setDescription(`${streakBonus}${levelUpLine}`)
      .setFooter({ text: `Next reset: 9:00 AM IST` })
      .setTimestamp(nextResetUTC());

    await message.reply({ embeds: [embed] });
  }
};
