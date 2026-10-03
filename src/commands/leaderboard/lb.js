const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User      = require('../../models/User');
const UserSpirit = require('../../models/UserSpirit');
const { fmt }   = require('../../utils/format');

const PAGE_SIZE = 10;
const MEDALS    = ['🥇', '🥈', '🥉'];

// ── Config ────────────────────────────────────────────────────────────────────
const FIELD_MAP = {
  mana:       { field: 'mana',             label: 'Mana',          unit: 'Mana'    },
  summon:     { field: 'summonCount',       label: 'Summons',       unit: 'summons' },
  summons:    { field: 'summonCount',       label: 'Summons',       unit: 'summons' },
  streak:     { field: 'battleStreak',      label: 'Battle Streak', unit: 'streak'  },
  beststreak: { field: 'bestBattleStreak',  label: 'Best Streak',   unit: 'streak'  },
  wins:       { field: 'wins',              label: 'Battle Wins',   unit: 'wins'    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchName(client, userId) {
  try { return (await client.users.fetch(userId)).username; } catch { return userId; }
}

function pageButtons(page, totalPages, typeKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_prev_${typeKey}_${page}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`lb_page_${typeKey}_${page}`)
      .setLabel(`Page ${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`lb_next_${typeKey}_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

// ── Build a single page ───────────────────────────────────────────────────────
async function buildLbEmbed(client, typeKey, page, callerId) {
  const skip = (page - 1) * PAGE_SIZE;

  // ── Spirits type (aggregation) ────────────────────────────────────────────
  if (typeKey === 'spirits') {
    const totalPlayers = (await UserSpirit.aggregate([
      { $group: { _id: '$ownerId' } }, { $count: 'n' }
    ]))[0]?.n || 0;
    const totalPages = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
    const safePage   = Math.min(Math.max(1, page), totalPages);

    const rows = await UserSpirit.aggregate([
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $skip: (safePage - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE }
    ]);

    const lines = await Promise.all(rows.map(async (r, i) => {
      const rank  = (safePage - 1) * PAGE_SIZE + i + 1;
      const medal = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
      const name  = await fetchName(client, r._id);
      return `${medal} ${name} — **${fmt(r.count)}** spirits`;
    }));

    // Personal rank
    const myCount = await UserSpirit.countDocuments({ ownerId: callerId });
    const myAbove = (await UserSpirit.aggregate([
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
      { $match: { count: { $gt: myCount } } },
      { $count: 'n' }
    ]))[0]?.n ?? 0;
    const myRank   = myAbove + 1;
    const myPage   = Math.ceil(myRank / PAGE_SIZE);
    const myFooter = `📊 You — #${myRank} with ${fmt(myCount)} spirits (page ${myPage})`;

    return {
      embed: new EmbedBuilder()
        .setColor(0x7B68EE)
        .setTitle('🏆 Most Spirits Leaderboard')
        .setDescription(lines.join('\n') || 'No entries yet.')
        .addFields({ name: 'Your Standing', value: myFooter })
        .setFooter({ text: `Page ${safePage}/${totalPages} • c lb spirits [page]` }),
      totalPages: safePage,
      currentPage: safePage,
      typeKey
    };
  }

  // ── Standard User field types ─────────────────────────────────────────────
  const config = FIELD_MAP[typeKey] || FIELD_MAP.mana;
  const { field, label, unit } = config;

  const totalPlayers = await User.countDocuments({ [field]: { $gt: 0 } });
  const totalPages   = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
  const safePage     = Math.min(Math.max(1, page), totalPages);

  const users = await User.find({ [field]: { $gt: 0 } })
    .sort({ [field]: -1 })
    .skip((safePage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  const lines = await Promise.all(users.map(async (u, i) => {
    const rank  = (safePage - 1) * PAGE_SIZE + i + 1;
    const medal = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
    const name  = await fetchName(client, u.userId);
    return `${medal} ${name} — **${fmt(u[field])}** ${unit}`;
  }));

  // Personal rank
  const me      = await User.findOne({ userId: callerId });
  const myVal   = me?.[field] || 0;
  const myAbove = await User.countDocuments({ [field]: { $gt: myVal } });
  const myRank  = myAbove + 1;
  const myPage  = Math.ceil(myRank / PAGE_SIZE);

  const myStanding = myVal > 0
    ? `You are ranked **#${myRank}** with **${fmt(myVal)} ${unit}** — find yourself on page **${myPage}**`
    : `You have no ${unit} recorded yet.`;

  return {
    embed: new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle(`🏆 ${label} Leaderboard`)
      .setDescription(lines.join('\n') || 'No entries yet.')
      .addFields({ name: '📊 Your Standing', value: myStanding })
      .setFooter({ text: `Page ${safePage}/${totalPages} • c lb ${typeKey} [page] • types: mana summons wins streak beststreak spirits` }),
    totalPages,
    currentPage: safePage,
    typeKey
  };
}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  name: 'lb',
  aliases: ['leaderboard'],
  description: 'Paginated leaderboard. Types: mana, summons, wins, streak, beststreak, spirits.',

  async execute({ client, message, args }) {
    // c lb [type] [page]
    // e.g. c lb mana 3 | c lb spirits | c lb wins 2
    let typeKey = 'mana';
    let page    = 1;

    for (const arg of args) {
      const n = parseInt(arg);
      if (!isNaN(n) && n > 0) page = n;
      else if (FIELD_MAP[arg.toLowerCase()] || arg.toLowerCase() === 'spirits') typeKey = arg.toLowerCase();
    }

    const { embed, totalPages, currentPage } = await buildLbEmbed(client, typeKey, page, message.author.id);
    const components = totalPages > 1 ? [pageButtons(currentPage, totalPages, typeKey)] : [];
    const sent = await message.reply({ embeds: [embed], components });

    if (totalPages <= 1) return;

    // ── Button collector — only original user can page ────────────────────
    const collector = sent.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId.startsWith('lb_'),
      time:   120_000   // 2 minutes
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      const parts    = interaction.customId.split('_');   // lb_prev/next_typeKey_page
      const dir      = parts[1];
      const curPage  = parseInt(parts[parts.length - 1]);
      const newPage  = dir === 'next' ? curPage + 1 : curPage - 1;

      const result = await buildLbEmbed(client, typeKey, newPage, message.author.id);
      await interaction.editReply({
        embeds:     [result.embed],
        components: result.totalPages > 1 ? [pageButtons(result.currentPage, result.totalPages, typeKey)] : []
      });
    });

    collector.on('end', async () => {
      await sent.edit({ components: [] }).catch(() => null);  // remove buttons when expired
    });
  }
};
