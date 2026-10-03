const { EmbedBuilder }    = require('discord.js');
const { getOrCreateUser } = require('../../services/userService');
const UserSpirit          = require('../../models/UserSpirit');
const {
  levelFromXp, xpToNextLevel, totalXpForLevel,
  playerTitle, progressBar, MAX_PLAYER_LEVEL
} = require('../../services/playerLevelService');
const { fmt } = require('../../utils/format');

// c rank          → your own rank card
// c rank @user    → another player's rank card

module.exports = {
  name: 'rank',
  aliases: ['level', 'lvl', 'xp'],
  description: 'View your player level and account XP progress.',

  async execute({ client, message, args, prefix }) {
    // Resolve target player
    const mention = args[0]?.replace(/[<@!>]/g, '');
    const targetId = mention && /^\d+$/.test(mention) ? mention : message.author.id;
    const isOwn    = targetId === message.author.id;

    const user     = await getOrCreateUser(targetId);
    const totalXp  = user.playerXp || 0;
    const level    = levelFromXp(totalXp);
    const title    = playerTitle(level);
    const toNext   = xpToNextLevel(totalXp);
    const thisLvl  = totalXpForLevel(level);
    const nextLvl  = toNext !== null ? totalXpForLevel(level + 1) : null;
    const bar      = progressBar(totalXp, 18);
    const intoLevel = totalXp - thisLvl;

    // Fetch discord username for display
    let username = targetId;
    try { username = (await client.users.fetch(targetId)).username; } catch {}

    const spiritCount = await UserSpirit.countDocuments({ ownerId: targetId });

    // Progress text
    const progressText = level >= MAX_PLAYER_LEVEL
      ? '`' + bar + '` MAX LEVEL'
      : `\`${bar}\` ${fmt(intoLevel)} / ${fmt(nextLvl - thisLvl)} XP`;

    const nextText = level >= MAX_PLAYER_LEVEL
      ? 'You have reached the maximum player level!'
      : `**${fmt(toNext)} XP** to reach Level **${level + 1}**`;

    // Colour shifts by level range
    const color =
      level >= 90 ? 0xFFD700 :
      level >= 60 ? 0x7B68EE :
      level >= 30 ? 0x1ABC9C :
                    0x5DADE2;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${isOwn ? '🌟 Your' : `🌟 ${username}'s`} Player Rank`)
      .addFields(
        { name: 'Level',         value: `**${level}** / ${MAX_PLAYER_LEVEL}`,        inline: true  },
        { name: 'Title',         value: `*${title}*`,                                inline: true  },
        { name: 'Total XP',      value: `**${fmt(totalXp)}** XP`,                   inline: true  },
        { name: 'Progress',      value: progressText,                                inline: false },
        { name: 'Next Level',    value: nextText,                                    inline: false },
        { name: 'Spirits',       value: `**${fmt(spiritCount)}** owned`,             inline: true  },
        { name: 'Battles',       value: `**${fmt(user.wins + user.losses)}** total`, inline: true  },
        { name: 'Win Rate',      value: (user.wins + user.losses) > 0
          ? `**${((user.wins / (user.wins + user.losses)) * 100).toFixed(1)}%**`
          : '**—**', inline: true },
      )
      .setFooter({ text: `XP from battles, daily, summons & Stardust • ${prefix}ranklb for leaderboard` });

    await message.reply({ embeds: [embed] });
  }
};
