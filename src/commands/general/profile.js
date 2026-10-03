const { EmbedBuilder }    = require('discord.js');
const { getOrCreateUser } = require('../../services/userService');
const UserSpirit          = require('../../models/UserSpirit');
const { fmt, timeLeft }   = require('../../utils/format');
const { levelFromXp, playerTitle, xpToNextLevel } = require('../../services/playerLevelService');

module.exports = {
  name: 'profile',
  aliases: ['p', 'bal', 'balance'],
  description: 'View your Celestia profile.',

  async execute({ client, message, args, prefix }) {
    // Can view another player's profile with c profile @user
    const mention  = args[0]?.replace(/[<@!>]/g, '');
    const targetId = mention && /^\d+$/.test(mention) ? mention : message.author.id;
    const isOwn    = targetId === message.author.id;

    const user     = await getOrCreateUser(targetId);
    const count    = await UserSpirit.countDocuments({ ownerId: targetId });

    let username = targetId;
    try { username = (await client.users.fetch(targetId)).username; } catch {}

    // Player level
    const totalXp  = user.playerXp || 0;
    const level    = levelFromXp(totalXp);
    const title    = playerTitle(level);
    const toNext   = xpToNextLevel(totalXp);

    // Key access
    const access = user.premium.customAccessUntil && new Date(user.premium.customAccessUntil).getTime() > Date.now()
      ? `Active — ${timeLeft(user.premium.customAccessUntil)} left`
      : 'Not active';

    // Win rate
    const totalBattles = user.wins + user.losses;
    const winRate = totalBattles > 0
      ? `${((user.wins / totalBattles) * 100).toFixed(1)}%`
      : '—';

    const embed = new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle(`🌌 ${isOwn ? 'Your' : `${username}'s`} Celestia Profile`)
      .addFields(
        // Player level row
        {
          name:   '🌟 Player Level',
          value:  `Lv.**${level}** — *${title}*\n${toNext !== null ? `${fmt(toNext)} XP to next level` : 'MAX LEVEL'}`,
          inline: false
        },
        // Economy row
        { name: '🔮 Mana',        value: `**${fmt(user.mana)}**`,        inline: true },
        { name: '✨ Stardust',    value: `**${fmt(user.stardust || 0)}**`, inline: true },
        { name: '⭐ STAR',        value: `**${user.premium.starsAvailable || 0}** avail / **${user.premium.starsPending || 0}** pending`, inline: true },
        // Collection row
        { name: '📦 Spirits',     value: `**${fmt(count)}** owned`,        inline: true },
        { name: '🌀 Summons',     value: `**${fmt(user.summonCount)}**`,   inline: true },
        { name: '🔑 Key',         value: access,                           inline: true },
        // Battle row
        { name: '⚔️ Wins',        value: `**${fmt(user.wins)}**`,         inline: true },
        { name: '💀 Losses',      value: `**${fmt(user.losses)}**`,        inline: true },
        { name: '🎯 Win Rate',    value: `**${winRate}**`,                 inline: true },
        // Streak row
        { name: '🔥 Battle Streak', value: `**${fmt(user.battleStreak)}** / Best: **${fmt(user.bestBattleStreak)}**`, inline: true },
        { name: '📅 Daily Streak',  value: `**${fmt(user.daily.streak)}** days`, inline: true },
      )
      .setFooter({ text: `${prefix}rank for level details • ${prefix}sanctuary for full overview` });

    await message.reply({ embeds: [embed] });
  }
};
