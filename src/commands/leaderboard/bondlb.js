const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserSpirit = require('../../models/UserSpirit');
const { fmt }    = require('../../utils/format');
const { bondTitle } = require('../../services/bondService');

const PAGE_SIZE = 10;
const MEDALS    = ['🥇', '🥈', '🥉'];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchName(client, userId) {
  try { return (await client.users.fetch(userId)).username; } catch { return userId; }
}

function pageButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bondlb_prev_${page}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`bondlb_page_${page}`)
      .setLabel(`Page ${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`bondlb_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

// ── Build a single page ───────────────────────────────────────────────────────
async function buildBondLbEmbed(client, page, callerId) {
  // Count distinct players with any bond points
  const totalCountAgg = await UserSpirit.aggregate([
    { $group: { _id: '$ownerId', total: { $sum: '$bondPoints' } } },
    { $match: { total: { $gt: 0 } } },
    { $count: 'n' }
  ]);
  const totalPlayers = totalCountAgg[0]?.n || 0;
  const totalPages   = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
  const safePage     = Math.min(Math.max(1, page), totalPages);
  const skip         = (safePage - 1) * PAGE_SIZE;

  // Page data
  const rows = await UserSpirit.aggregate([
    { $group: {
        _id:              '$ownerId',
        totalBond:        { $sum: '$bondPoints' },
        highestSingleBond:{ $max: '$bondPoints' },
        bondedSpirits:    { $sum: 1 }
    }},
    { $match: { totalBond: { $gt: 0 } } },
    { $sort: { totalBond: -1, highestSingleBond: -1 } },
    { $skip: skip },
    { $limit: PAGE_SIZE }
  ]);

  const lines = await Promise.all(rows.map(async (r, i) => {
    const rank    = skip + i + 1;
    const medal   = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
    const name    = await fetchName(client, r._id);
    // Show highest single bond title as a flavour detail
    const topTitle = bondTitle(Math.floor(Math.sqrt(r.highestSingleBond / 100)));
    return `${medal} ${name} — **${fmt(r.totalBond)}** pts · top bond: *${topTitle}*`;
  }));

  // ── Personal standing (always shown, any page) ────────────────────────────
  const myAgg = await UserSpirit.aggregate([
    { $match: { ownerId: callerId } },
    { $group: {
        _id:        null,
        total:      { $sum: '$bondPoints' },
        highest:    { $max: '$bondPoints' },
        spiritCount:{ $sum: 1 }
    }}
  ]);
  const myTotal   = myAgg[0]?.total   || 0;
  const myHighest = myAgg[0]?.highest || 0;

  const myAboveAgg = await UserSpirit.aggregate([
    { $group: { _id: '$ownerId', total: { $sum: '$bondPoints' } } },
    { $match: { total: { $gt: myTotal } } },
    { $count: 'n' }
  ]);
  const myRank  = (myAboveAgg[0]?.n ?? 0) + 1;
  const myPage  = Math.ceil(myRank / PAGE_SIZE);
  const myTitle = bondTitle(Math.floor(Math.sqrt(myHighest / 100)));

  const myStanding = myTotal > 0
    ? `Rank **#${myRank}** · **${fmt(myTotal)}** total bond pts · highest title: *${myTitle}* · find yourself on page **${myPage}**`
    : `You have no bond points yet. Battle with your spirits to earn bond!`;

  return {
    embed: new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('💞 Spirit Bond Leaderboard')
      .setDescription(lines.join('\n') || 'No bond points recorded yet.')
      .addFields({ name: '📊 Your Standing', value: myStanding })
      .setFooter({ text: `Page ${safePage}/${totalPages} • c bondlb [page] • Bond grows through battles` }),
    totalPages,
    currentPage: safePage
  };
}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  name: 'bondlb',
  aliases: ['bondleaderboard', 'lblove'],
  description: 'Paginated Spirit Bond leaderboard with your personal rank.',

  async execute({ client, message, args }) {
    const page = parseInt(args[0]) || 1;
    const { embed, totalPages, currentPage } = await buildBondLbEmbed(client, page, message.author.id);
    const components = totalPages > 1 ? [pageButtons(currentPage, totalPages)] : [];
    const sent = await message.reply({ embeds: [embed], components });

    if (totalPages <= 1) return;

    const collector = sent.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId.startsWith('bondlb_'),
      time:   120_000
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      const parts   = interaction.customId.split('_');
      const dir     = parts[1];
      const curPage = parseInt(parts[2]);
      const newPage = dir === 'next' ? curPage + 1 : curPage - 1;

      const result = await buildBondLbEmbed(client, newPage, message.author.id);
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
