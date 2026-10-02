const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User   = require('../../models/User');
const { fmt } = require('../../utils/format');

const PAGE_SIZE    = 10;
const MEDALS       = ['🥇', '🥈', '🥉'];
const STARDUST_EMOJI = '✨';  // replace with <:stardust:ID> when uploaded

async function fetchName(client, userId) {
  try { return (await client.users.fetch(userId)).username; } catch { return userId; }
}

function pageButtons(page, totalPages, mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dustlb_prev_${mode}_${page}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`dustlb_page_${mode}_${page}`)
      .setLabel(`Page ${page}/${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`dustlb_next_${mode}_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    // Toggle button
    new ButtonBuilder()
      .setCustomId(`dustlb_toggle_${mode}_${page}`)
      .setLabel(mode === 'total' ? '🔄 Switch to Available' : '🔄 Switch to Total')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ── Build embed ───────────────────────────────────────────────────────────────
async function buildDustLbEmbed(client, mode, page, callerId) {
  // mode: 'total' = stardustTotal (ever accumulated)
  //       'available' = stardust (current balance)
  const field    = mode === 'total' ? 'stardustTotal' : 'stardust';
  const label    = mode === 'total' ? 'Total Accumulated' : 'Available Balance';
  const unit     = `Stardust ${STARDUST_EMOJI}`;

  const totalPlayers = await User.countDocuments({ [field]: { $gt: 0 } });
  const totalPages   = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
  const safePage     = Math.min(Math.max(1, page), totalPages);
  const skip         = (safePage - 1) * PAGE_SIZE;

  const users = await User.find({ [field]: { $gt: 0 } })
    .sort({ [field]: -1 })
    .skip(skip)
    .limit(PAGE_SIZE);

  if (!users.length) {
    return {
      embed: new EmbedBuilder()
        .setColor(0xB8860B)
        .setTitle(`${STARDUST_EMOJI} Stardust Leaderboard — ${label}`)
        .setDescription('No Stardust earned yet! Crush weapons to get started.')
        .setFooter({ text: 'c crush to earn Stardust' }),
      totalPages: 1,
      currentPage: 1,
      mode
    };
  }

  const lines = await Promise.all(users.map(async (u, i) => {
    const rank  = skip + i + 1;
    const medal = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
    const name  = await fetchName(client, u.userId);
    return `${medal} **${name}** — **${fmt(u[field] || 0)}** ${unit}`;
  }));

  // ── Personal standing ─────────────────────────────────────────────────────
  const me     = await User.findOne({ userId: callerId });
  const myVal  = me?.[field] || 0;
  const myAbove = await User.countDocuments({ [field]: { $gt: myVal } });
  const myRank  = myAbove + 1;
  const myPage  = Math.ceil(myRank / PAGE_SIZE);

  const myStanding = myVal > 0
    ? `Rank **#${myRank}** · **${fmt(myVal)}** ${unit} · on page **${myPage}**`
    : `You haven't earned any Stardust yet. Use \`c crush\` to get started!`;

  // Mode subtitle
  const subtitle = mode === 'total'
    ? 'Ranked by total Stardust ever earned from crushing weapons.'
    : 'Ranked by current unspent Stardust balance.';

  return {
    embed: new EmbedBuilder()
      .setColor(0xB8860B)
      .setTitle(`${STARDUST_EMOJI} Stardust Leaderboard — ${label}`)
      .setDescription(subtitle + '\n\n' + lines.join('\n'))
      .addFields({ name: '📊 Your Standing', value: myStanding })
      .setFooter({
        text: mode === 'total'
          ? `Page ${safePage}/${totalPages} · Switch: toggle button below · c stardust for balance`
          : `Page ${safePage}/${totalPages} · Switch: toggle button below · c crush to earn more`
      }),
    totalPages,
    currentPage: safePage,
    mode
  };
}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  name: 'dustlb',
  aliases: ['stardustlb', 'sdlb', 'dustleaderboard'],
  description: 'Stardust leaderboard — total accumulated or available balance.',

  async execute({ client, message, args, prefix }) {
    // c dustlb [total|available] [page]
    let mode = 'total';
    let page = 1;

    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (lower === 'available' || lower === 'a' || lower === 'bal') mode = 'available';
      else if (lower === 'total'    || lower === 't')                  mode = 'total';
      else if (!isNaN(parseInt(arg)) && parseInt(arg) > 0)            page = parseInt(arg);
    }

    const { embed, totalPages, currentPage } = await buildDustLbEmbed(client, mode, page, message.author.id);
    const components = [pageButtons(currentPage, totalPages, mode)];
    const sent = await message.reply({ embeds: [embed], components });

    const collector = sent.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id && i.customId.startsWith('dustlb_'),
      time:   120_000
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      const parts = interaction.customId.split('_');
      // parts: dustlb_action_mode_page
      const action  = parts[1];
      const curMode = parts[2];
      const curPage = parseInt(parts[3]);

      let newMode = curMode;
      let newPage = curPage;

      if (action === 'prev')   newPage = Math.max(1, curPage - 1);
      else if (action === 'next')   newPage = curPage + 1;
      else if (action === 'toggle') {
        newMode = curMode === 'total' ? 'available' : 'total';
        newPage = 1;
      } else if (action === 'page') return; // disabled btn, do nothing

      const result = await buildDustLbEmbed(client, newMode, newPage, message.author.id);
      await interaction.editReply({
        embeds:     [result.embed],
        components: [pageButtons(result.currentPage, result.totalPages, result.mode)]
      });
    });

    collector.on('end', async () => {
      await sent.edit({ components: [] }).catch(() => null);
    });
  }
};
