const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const UserSpirit = require('../../models/UserSpirit');
const { RARITIES } = require('../../config/game');

// ── Rarity display config ─────────────────────────────────────────────────────
const RARITY_EMOJI = {
  Common:    '⬜',
  Uncommon:  '🟩',
  Rare:      '🟦',
  Epic:      '🟪',
  Custom:    '🌐',
  Legendary: '🟨',
  Mythic:    '🔶',
  Celestial: '💠',
  Ascended:  '🔱',
};

const RARITY_ORDER = ['Common','Uncommon','Rare','Epic','Custom','Legendary','Mythic','Celestial','Ascended'];

const TYPES = ['Light','Void','Flame','Nature','Storm','Tide'];

const TYPE_EMOJI = {
  Light: '✨', Void: '🌙', Flame: '🔥',
  Nature: '🍃', Storm: '⚡', Tide: '🌊'
};

const PAGE_SIZE = 15;

// ── Sort options ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = {
  rarity:  { label: 'Rarity',      sort: (a, b) => RARITY_ORDER.indexOf(b.spirit.tier) - RARITY_ORDER.indexOf(a.spirit.tier) },
  level:   { label: 'Level',       sort: (a, b) => b.level - a.level },
  bond:    { label: 'Bond',        sort: (a, b) => (b.bondPoints || 0) - (a.bondPoints || 0) },
  name:    { label: 'Name',        sort: (a, b) => a.spirit.name.localeCompare(b.spirit.name) },
  id:      { label: 'Spirit ID',   sort: (a, b) => a.shortId.localeCompare(b.shortId) },
  newest:  { label: 'Newest',      sort: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
};

// ── Filter logic ──────────────────────────────────────────────────────────────
function applyFilters(spirits, filters) {
  return spirits.filter(s => {
    if (filters.rarity && s.spirit.tier !== filters.rarity) return false;
    if (filters.type   && !s.spirit.types.includes(filters.type)) return false;
    if (filters.locked !== null && s.locked !== filters.locked) return false;
    if (filters.dupes  && !(s._dupeCount > 1)) return false;
    if (filters.team   && !s._inTeam) return false;
    if (filters.minLevel && s.level < filters.minLevel) return false;
    if (filters.maxLevel && s.level > filters.maxLevel) return false;
    if (filters.minBond  && (s.bondPoints || 0) < filters.minBond) return false;
    return true;
  });
}

// ── Format one line ───────────────────────────────────────────────────────────
function formatLine(s) {
  const rEmoji  = RARITY_EMOJI[s.spirit.tier] || '⬜';
  const lock    = s.locked ? ' 🔒' : '';
  const team    = s._inTeam ? ' ⚔️' : '';
  const name    = s.nickname || s.spirit.name;
  const bondStr = s.bondPoints > 0 ? ` ♡${s.bondPoints}` : '';
  // shortId padded for alignment, name truncated if too long
  const shortName = name.length > 18 ? name.slice(0, 17) + '…' : name;
  return `${rEmoji} \`${s.shortId.padEnd(6)}\` ${s.spirit.emoji} **${shortName}** · Lv.**${s.level}**${bondStr}${lock}${team}`;
}

// ── Build embed ───────────────────────────────────────────────────────────────
function buildEmbed(spirits, page, totalPages, totalCount, filters, sortKey, targetId, isOwn) {
  const start   = (page - 1) * PAGE_SIZE;
  const slice   = spirits.slice(start, start + PAGE_SIZE);
  const lines   = slice.map(formatLine);

  // Filter summary line
  const activeFilters = [];
  if (filters.rarity)   activeFilters.push(`Rarity: ${filters.rarity}`);
  if (filters.type)     activeFilters.push(`Type: ${filters.type}`);
  if (filters.locked !== null) activeFilters.push(filters.locked ? 'Locked only' : 'Unlocked only');
  if (filters.dupes)    activeFilters.push('Duplicates only');
  if (filters.team)     activeFilters.push('Team spirits');
  if (filters.minLevel) activeFilters.push(`Lv≥${filters.minLevel}`);
  if (filters.maxLevel) activeFilters.push(`Lv≤${filters.maxLevel}`);
  if (filters.minBond)  activeFilters.push(`Bond≥${filters.minBond}`);
  const filterLine = activeFilters.length ? `Filters: **${activeFilters.join(' · ')}**` : '';
  const sortLabel  = SORT_OPTIONS[sortKey]?.label || 'Rarity';

  const title = isOwn
    ? `📦 Your Collection`
    : `📦 ${targetId}'s Collection`;

  return new EmbedBuilder()
    .setColor(0x1d9e75)
    .setTitle(title)
    .setDescription(
      (filterLine ? filterLine + '\n\n' : '') +
      (lines.length ? lines.join('\n') : '*No spirits match this filter.*')
    )
    .addFields({
      name: '📊 Summary',
      value: `**${totalCount}** spirit${totalCount === 1 ? '' : 's'} shown · Sort: **${sortLabel}** · Page **${page}/${totalPages}**`
    })
    .setFooter({
      text: [
        '⬜C 🟩U 🟦R 🟪E 🟨L 🔶M 💠Cel 🌐Cust',
        '🔒=Locked · ⚔️=In team · ♡=Bond pts',
        'Use the menus below to filter and sort'
      ].join('  •  ')
    });
}

// ── Navigation buttons ────────────────────────────────────────────────────────
function navRow(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`col_prev_${page}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`col_page`)
      .setLabel(`Page ${page}/${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`col_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId('col_reset')
      .setLabel('Reset Filters')
      .setStyle(ButtonStyle.Danger),
  );
}

// ── Filter select menus ───────────────────────────────────────────────────────
function filterRows() {
  const rarityMenu = new StringSelectMenuBuilder()
    .setCustomId('col_filter_rarity')
    .setPlaceholder('🎯 Filter by Rarity')
    .addOptions([
      { label: 'All Rarities',  value: 'all',       description: 'Show all spirits' },
      { label: 'Common',        value: 'Common',     emoji: '⬜' },
      { label: 'Uncommon',      value: 'Uncommon',   emoji: '🟩' },
      { label: 'Rare',          value: 'Rare',       emoji: '🟦' },
      { label: 'Epic',          value: 'Epic',       emoji: '🟪' },
      { label: 'Legendary',     value: 'Legendary',  emoji: '🟨' },
      { label: 'Mythic',        value: 'Mythic',     emoji: '🔶' },
      { label: 'Celestial',     value: 'Celestial',  emoji: '💠' },
      { label: 'Custom',        value: 'Custom',     emoji: '🌐' },
    ]);

  const typeAndSortMenu = new StringSelectMenuBuilder()
    .setCustomId('col_filter_type')
    .setPlaceholder('🌊 Filter by Type / Special')
    .addOptions([
      { label: 'All Types',      value: 'all',    description: 'Show all types' },
      { label: 'Light',          value: 'Light',  emoji: '✨' },
      { label: 'Void',           value: 'Void',   emoji: '🌙' },
      { label: 'Flame',          value: 'Flame',  emoji: '🔥' },
      { label: 'Nature',         value: 'Nature', emoji: '🍃' },
      { label: 'Storm',          value: 'Storm',  emoji: '⚡' },
      { label: 'Tide',           value: 'Tide',   emoji: '🌊' },
      { label: '🔒 Locked only',      value: 'locked'   },
      { label: '🔓 Unlocked only',    value: 'unlocked' },
      { label: '👥 Duplicates only',  value: 'dupes'    },
      { label: '⚔️ Team spirits',     value: 'team'     },
    ]);

  const sortMenu = new StringSelectMenuBuilder()
    .setCustomId('col_sort')
    .setPlaceholder('🔃 Sort by...')
    .addOptions([
      { label: 'Sort by Rarity',    value: 'rarity'  },
      { label: 'Sort by Level',     value: 'level'   },
      { label: 'Sort by Bond',      value: 'bond'    },
      { label: 'Sort by Name',      value: 'name'    },
      { label: 'Sort by Spirit ID', value: 'id'      },
      { label: 'Sort by Newest',    value: 'newest'  },
    ]);

  return [
    new ActionRowBuilder().addComponents(rarityMenu),
    new ActionRowBuilder().addComponents(typeAndSortMenu),
    new ActionRowBuilder().addComponents(sortMenu),
  ];
}

// ── Load all spirits for a user with enrichment ───────────────────────────────
async function loadSpirits(userId) {
  const spirits = await UserSpirit.find({ ownerId: userId })
    .populate('spirit')
    .sort({ createdAt: -1 })
    .lean();

  // Mark duplicates
  const countMap = {};
  for (const s of spirits) {
    const key = s.spirit._id.toString();
    countMap[key] = (countMap[key] || 0) + 1;
  }
  for (const s of spirits) {
    s._dupeCount = countMap[s.spirit._id.toString()];
  }

  return spirits;
}

// Mark which spirits are in the user's team
async function markTeam(spirits, user) {
  // user doc not available here — we mark by checking shortIds
  // This is called from the command where we pass team slots
  return spirits;
}

// ── Session state store (in-memory, per message) ──────────────────────────────
const sessions = new Map();

// ── Main command ──────────────────────────────────────────────────────────────
module.exports = {
  name: 'collection',
  aliases: ['col', 'c'],

  async execute({ client, message, args, prefix }) {
    // c col [page] [rarity/type filter shortcut]
    // e.g. c col 2 | c col flame | c col legendary

    const userId   = message.author.id;
    let page       = 1;
    let initRarity = null;
    let initType   = null;

    for (const arg of args) {
      const n = parseInt(arg);
      if (!isNaN(n) && n > 0) { page = n; continue; }
      const lower = arg.toLowerCase();
      const matchRarity = RARITY_ORDER.find(r => r.toLowerCase() === lower);
      const matchType   = TYPES.find(t => t.toLowerCase() === lower);
      if (matchRarity) initRarity = matchRarity;
      else if (matchType) initType = matchType;
    }

    const allSpirits = await loadSpirits(userId);

    if (!allSpirits.length) {
      return message.reply(`You don't own any spirits yet! Use \`${prefix}s\` to summon your first.`);
    }

    // Build initial filter state
    const filters = {
      rarity:   initRarity,
      type:     initType,
      locked:   null,
      dupes:    false,
      team:     false,
      minLevel: null,
      maxLevel: null,
      minBond:  null,
    };
    let sortKey = 'rarity';

    const filtered    = applyFilters(allSpirits, filters).sort(SORT_OPTIONS[sortKey].sort);
    const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage    = Math.min(Math.max(1, page), totalPages);

    const embed      = buildEmbed(filtered, safePage, totalPages, filtered.length, filters, sortKey, userId, true);
    const components = [navRow(safePage, totalPages), ...filterRows()];

    const sent = await message.reply({ embeds: [embed], components });

    // Store session
    const sessionKey = sent.id;
    sessions.set(sessionKey, { allSpirits, filters, sortKey, page: safePage, userId });

    // ── Collector ─────────────────────────────────────────────────────────────
    const collector = sent.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time:   300_000   // 5 minutes
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();

      const session = sessions.get(sessionKey);
      if (!session) return;

      const { customId, values } = interaction;

      // ── Page navigation ───────────────────────────────────────────────────
      if (customId.startsWith('col_prev_')) {
        session.page = Math.max(1, session.page - 1);
      } else if (customId.startsWith('col_next_')) {
        const totalPg = Math.max(1, Math.ceil(
          applyFilters(session.allSpirits, session.filters).length / PAGE_SIZE
        ));
        session.page = Math.min(totalPg, session.page + 1);

      // ── Reset ─────────────────────────────────────────────────────────────
      } else if (customId === 'col_reset') {
        session.filters = { rarity: null, type: null, locked: null, dupes: false, team: false, minLevel: null, maxLevel: null, minBond: null };
        session.sortKey = 'rarity';
        session.page    = 1;

      // ── Rarity filter ─────────────────────────────────────────────────────
      } else if (customId === 'col_filter_rarity') {
        const val = values[0];
        session.filters.rarity = val === 'all' ? null : val;
        session.page = 1;

      // ── Type / special filter ─────────────────────────────────────────────
      } else if (customId === 'col_filter_type') {
        const val = values[0];
        // Reset type and special flags first
        session.filters.type   = null;
        session.filters.locked = null;
        session.filters.dupes  = false;
        session.filters.team   = false;

        if (val === 'all')      { /* already cleared */ }
        else if (val === 'locked')   { session.filters.locked = true;  }
        else if (val === 'unlocked') { session.filters.locked = false; }
        else if (val === 'dupes')    { session.filters.dupes  = true;  }
        else if (val === 'team')     { session.filters.team   = true;  }
        else                         { session.filters.type   = val;   }
        session.page = 1;

      // ── Sort ──────────────────────────────────────────────────────────────
      } else if (customId === 'col_sort') {
        session.sortKey = values[0];
        session.page    = 1;
      }

      // Rebuild
      const f  = applyFilters(session.allSpirits, session.filters)
                   .sort(SORT_OPTIONS[session.sortKey]?.sort || SORT_OPTIONS.rarity.sort);
      const tp = Math.max(1, Math.ceil(f.length / PAGE_SIZE));
      session.page = Math.min(Math.max(1, session.page), tp);

      const newEmbed = buildEmbed(f, session.page, tp, f.length, session.filters, session.sortKey, session.userId, true);
      await interaction.editReply({
        embeds:     [newEmbed],
        components: [navRow(session.page, tp), ...filterRows()]
      });
    });

    collector.on('end', async () => {
      sessions.delete(sessionKey);
      // Remove interactive components, keep embed readable
      await sent.edit({ components: [] }).catch(() => null);
    });
  }
};
