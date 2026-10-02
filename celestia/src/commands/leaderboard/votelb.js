const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const VoteRecord = require('../../models/VoteRecord');
const { getUserVoteCounts, monthStart } = require('../../services/voteService');

const PAGE_SIZE = 10;
const MEDALS    = ['🥇', '🥈', '🥉'];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchName(client, userId) {
  try { return (await client.users.fetch(userId)).username; } catch { return userId; }
}

function pageButtons(page, totalPages, isMonthly) {
  const flag = isMonthly ? 'm' : 't';
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`votelb_prev_${flag}_${page}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`votelb_page_${flag}_${page}`)
      .setLabel(`Page ${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`votelb_next_${flag}_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

// ── Build a single page ───────────────────────────────────────────────────────
async function buildVoteLbEmbed(client, isMonthly, page, callerId, prefix) {
  const match     = isMonthly ? { votedAt: { $gte: monthStart() } } : {};
  const label     = isMonthly ? 'Monthly' : 'All-Time';
  const monthName = isMonthly
    ? monthStart().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;

  // Total distinct voters
  const totalCountAgg = await VoteRecord.aggregate([
    { $match: match },
    { $group: { _id: '$userId' } },
    { $count: 'n' }
  ]);
  const totalPlayers = totalCountAgg[0]?.n || 0;
  const totalPages   = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
  const safePage     = Math.min(Math.max(1, page), totalPages);
  const skip         = (safePage - 1) * PAGE_SIZE;

  if (!totalPlayers) {
    return {
      embed: new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`⭐ ${label} Vote Leaderboard${monthName ? ` — ${monthName}` : ''}`)
        .setDescription('No votes recorded yet! Be the first.')
        .addFields({ name: '📊 Your Standing', value: `Use \`${prefix}vote\` to vote and appear here!` })
        .setFooter({ text: `${prefix}vote to vote • ${prefix}votelb monthly for monthly` }),
      totalPages: 1,
      currentPage: 1
    };
  }

  // Page data
  const rows = await VoteRecord.aggregate([
    { $match: match },
    { $group: { _id: '$userId', votes: { $sum: 1 } } },
    { $sort: { votes: -1 } },
    { $skip: skip },
    { $limit: PAGE_SIZE }
  ]);

  const lines = await Promise.all(rows.map(async (r, i) => {
    const rank  = skip + i + 1;
    const medal = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
    const name  = await fetchName(client, r._id);
    return `${medal} **${name}** — ${r.votes} vote${r.votes === 1 ? '' : 's'}`;
  }));

  // ── Personal standing ─────────────────────────────────────────────────────
  const { total, monthly } = await getUserVoteCounts(callerId);
  const myCount = isMonthly ? monthly : total;

  let myRank = null;
  if (myCount > 0) {
    const myAboveAgg = await VoteRecord.aggregate([
      { $match: match },
      { $group: { _id: '$userId', votes: { $sum: 1 } } },
      { $match: { votes: { $gt: myCount } } },
      { $count: 'n' }
    ]);
    myRank = (myAboveAgg[0]?.n ?? 0) + 1;
  }

  const myPage = myRank ? Math.ceil(myRank / PAGE_SIZE) : null;

  const myStanding = myRank
    ? `Rank **#${myRank}** with **${myCount}** vote${myCount === 1 ? '' : 's'} · find yourself on page **${myPage}**`
    : myCount > 0
      ? `You have **${myCount}** vote${myCount === 1 ? '' : 's'} this period.`
      : `You haven't voted yet. Use \`${prefix}vote\` to start — you earn **200 Mana** per vote!`;

  return {
    embed: new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`⭐ ${label} Vote Leaderboard${monthName ? ` — ${monthName}` : ''}`)
      .setDescription(lines.join('\n'))
      .addFields({ name: '📊 Your Standing', value: myStanding })
      .setFooter({
        text: isMonthly
          ? `Page ${safePage}/${totalPages} • Switch: ${prefix}votelb total • Vote: ${prefix}vote`
          : `Page ${safePage}/${totalPages} • Switch: ${prefix}votelb monthly • Vote: ${prefix}vote`
      }),
    totalPages,
    currentPage: safePage
  };
}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  name: 'votelb',
  aliases: ['voterboard', 'voteleaderboard', 'votlb'],
  description: 'Paginated vote leaderboard — total or monthly.',

  async execute({ client, message, args, prefix }) {
    // c votelb [monthly|total] [page]
    let isMonthly = false;
    let page      = 1;

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (lower === 'monthly' || lower === 'm') isMonthly = true;
      else if (lower === 'total'   || lower === 't') isMonthly = false;
      else if (!isNaN(parseInt(arg)) && parseInt(arg) > 0) page = parseInt(arg);
    }

    const { embed, totalPages, currentPage } = await buildVoteLbEmbed(client, isMonthly, page, message.author.id, prefix);
    const components = totalPages > 1 ? [pageButtons(currentPage, totalPages, isMonthly)] : [];
    const sent = await message.reply({ embeds: [embed], components });

    if (totalPages <= 1) return;

    const collector = sent.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId.startsWith('votelb_'),
      time:   120_000
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      const parts    = interaction.customId.split('_'); // votelb_prev/next_m/t_page
      const dir      = parts[1];
      const monthly  = parts[2] === 'm';
      const curPage  = parseInt(parts[3]);
      const newPage  = dir === 'next' ? curPage + 1 : curPage - 1;

      const result = await buildVoteLbEmbed(client, monthly, newPage, message.author.id, prefix);
      await interaction.editReply({
        embeds:     [result.embed],
        components: result.totalPages > 1 ? [pageButtons(result.currentPage, result.totalPages, monthly)] : []
      });
    });

    collector.on('end', async () => {
      await sent.edit({ components: [] }).catch(() => null);
    });
  }
};
