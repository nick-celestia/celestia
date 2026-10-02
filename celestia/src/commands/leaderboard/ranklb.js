const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User      = require('../../models/User');
const { levelFromXp, playerTitle } = require('../../services/playerLevelService');
const { fmt }   = require('../../utils/format');

const PAGE_SIZE = 10;
const MEDALS    = ['🥇', '🥈', '🥉'];

async function fetchName(client, userId) {
  try { return (await client.users.fetch(userId)).username; } catch { return userId; }
}

function pageButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ranklb_prev_${page}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`ranklb_page_${page}`)
      .setLabel(`Page ${page}/${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`ranklb_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

async function buildRankLbEmbed(client, page, callerId) {
  const totalPlayers = await User.countDocuments({ playerXp: { $gt: 0 } });
  const totalPages   = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
  const safePage     = Math.min(Math.max(1, page), totalPages);
  const skip         = (safePage - 1) * PAGE_SIZE;

  const users = await User.find({ playerXp: { $gt: 0 } })
    .sort({ playerXp: -1 })
    .skip(skip)
    .limit(PAGE_SIZE);

  const lines = await Promise.all(users.map(async (u, i) => {
    const rank   = skip + i + 1;
    const medal  = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
    const name   = await fetchName(client, u.userId);
    const level  = levelFromXp(u.playerXp || 0);
    const title  = playerTitle(level);
    return `${medal} **${name}** · Lv.**${level}** *${title}* — **${fmt(u.playerXp || 0)} XP**`;
  }));

  // Personal standing
  const me       = await User.findOne({ userId: callerId });
  const myXp     = me?.playerXp || 0;
  const myLevel  = levelFromXp(myXp);
  const myTitle  = playerTitle(myLevel);
  const myAbove  = await User.countDocuments({ playerXp: { $gt: myXp } });
  const myRank   = myAbove + 1;
  const myPage   = Math.ceil(myRank / PAGE_SIZE);

  const myStanding = myXp > 0
    ? `Rank **#${myRank}** · Lv.**${myLevel}** *${myTitle}* · **${fmt(myXp)} XP** · page **${myPage}**`
    : `No XP yet — battle, summon, and claim daily to earn account XP!`;

  return {
    embed: new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle('🌟 Player Level Leaderboard — Global')
      .setDescription(lines.join('\n') || 'No players ranked yet.')
      .addFields({ name: '📊 Your Standing', value: myStanding })
      .setFooter({ text: `Page ${safePage}/${totalPages} · Global across all servers · c rank for your card` }),
    totalPages,
    currentPage: safePage
  };
}

module.exports = {
  name: 'ranklb',
  aliases: ['levellb', 'xplb', 'leveleaderboard'],
  description: 'Global player level leaderboard with pagination.',

  async execute({ client, message, args }) {
    const page = parseInt(args[0]) || 1;
    const { embed, totalPages, currentPage } = await buildRankLbEmbed(client, page, message.author.id);
    const components = totalPages > 1 ? [pageButtons(currentPage, totalPages)] : [];
    const sent = await message.reply({ embeds: [embed], components });

    if (totalPages <= 1) return;

    const collector = sent.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId.startsWith('ranklb_'),
      time:   120_000
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      const parts   = interaction.customId.split('_');
      const dir     = parts[1];
      const curPage = parseInt(parts[2]);
      const newPage = dir === 'next' ? curPage + 1 : curPage - 1;

      const result = await buildRankLbEmbed(client, newPage, message.author.id);
      await interaction.editReply({
        embeds:     [result.embed],
        components: result.totalPages > 1 ? [pageButtons(result.currentPage, result.totalPages)] : []
      });
    });

    collector.on('end', async () => {
      await sent.edit({ components: [] }).catch(() => null);
    });
  }
};
