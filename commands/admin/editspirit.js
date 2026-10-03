const Spirit = require('../../models/Spirit');
const { normalizeTier, slugify } = require('../../services/spiritService');
const { validateStatsForTier, validateTypes, powerScore } = require('../../utils/stats');
const { logEvent } = require('../../services/logService');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTargetAndUpdates(input) {
  const raw = String(input || '').trim();
  if (!raw) return { target: null, updates: {} };

  let target = '';
  let i = 0;

  if (raw[0] === '"' || raw[0] === "'") {
    const quote = raw[0];
    let end = 1;
    while (end < raw.length && raw[end] !== quote) end += 1;
    target = raw.slice(1, end);
    i = end + 1;
  } else {
    while (i < raw.length && !/\s/.test(raw[i])) i += 1;
    target = raw.slice(0, i);
  }

  const rest = raw.slice(i).trim();
  const updates = {};
  const regex = /([a-zA-Z]+)=("([^"]*)"|'([^']*)'|(\S+))/g;
  let match;

  while ((match = regex.exec(rest)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5];
    updates[key] = value;
  }

  return { target, updates };
}

function parseBool(value) {
  const v = String(value).toLowerCase();
  if (['true', 'yes', 'y', '1', 'on'].includes(v)) return true;
  if (['false', 'no', 'n', '0', 'off'].includes(v)) return false;
  return null;
}

async function findSpiritByTarget(target) {
  const trimmed = String(target || '').trim();
  if (!trimmed) return null;

  return Spirit.findOne({
    $or: [
      { slug: trimmed.toLowerCase() },
      { name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') }
    ]
  });
}

module.exports = {
  name: 'editspirit',
  aliases: ['updatespirit', 'setspirit'],
  botAdminOnly: true,
  description: 'Bot Admin: edit official spirit name, emoji, tier, type, stats, summonable/active status.',
  async execute({ client, message, rawArgs, isBotAdmin, isOwner }) {
    // Internal safety check, in case this command is added before commandHandler supports botAdminOnly.
    const allowed = typeof isBotAdmin === 'function'
      ? isBotAdmin(message.author.id)
      : (typeof isOwner === 'function' && isOwner(message.author.id));

    if (!allowed) return message.reply('Only Celestia bot admins can use this command.');

    const { target, updates } = parseTargetAndUpdates(rawArgs);

    if (!target || Object.keys(updates).length === 0) {
      return message.reply([
        'Use:',
        '`c editspirit <slug/name> emoji=<emoji>`',
        '`c editspirit <slug/name> hp=80 atk=12 def=10 spd=11`',
        '`c editspirit <slug/name> tier=Rare type=Light`',
        '`c editspirit <slug/name> active=false summonable=false`',
        '`c editspirit <slug/name> name="New Display Name"`',
        '',
        'Example:',
        '`c editspirit solara-fox emoji=<:solara:123456789012345678>`'
      ].join('\n'));
    }

    const spirit = await findSpiritByTarget(target);
    if (!spirit) return message.reply('Spirit not found. Use its slug, for example `solara-fox`, or exact name in quotes.');

    const before = {
      name: spirit.name,
      slug: spirit.slug,
      emoji: spirit.emoji,
      tier: spirit.tier,
      types: [...spirit.types],
      baseStats: { ...spirit.baseStats.toObject?.() || spirit.baseStats },
      active: spirit.active,
      summonable: spirit.summonable,
      source: spirit.source,
      animatedEmoji: spirit.animatedEmoji,
      isEvolvedForm: spirit.isEvolvedForm
    };

    const nextTier = updates.tier ? normalizeTier(updates.tier) : spirit.tier;
    if (!nextTier) return message.reply(`Invalid tier: ${updates.tier}`);

    const nextTypes = updates.type || updates.types
      ? String(updates.type || updates.types).split(/[\/,]/).map((t) => t.trim()).filter(Boolean)
      : [...spirit.types];

    const typeCheck = validateTypes(nextTypes);
    if (!typeCheck.ok) return message.reply(typeCheck.reason);

    const nextStats = {
      hp: updates.hp !== undefined ? Number(updates.hp) : spirit.baseStats.hp,
      atk: updates.atk !== undefined ? Number(updates.atk) : spirit.baseStats.atk,
      def: updates.def !== undefined ? Number(updates.def) : spirit.baseStats.def,
      spd: updates.spd !== undefined ? Number(updates.spd) : spirit.baseStats.spd
    };

    const statCheck = validateStatsForTier(nextTier, nextStats);
    if (!statCheck.ok) return message.reply(statCheck.reason);

    if (updates.name !== undefined) {
      const newName = String(updates.name).trim();
      if (!newName) return message.reply('Name cannot be empty.');
      spirit.name = newName;
    }

    if (updates.slug !== undefined) {
      const newSlug = slugify(updates.slug);
      if (!newSlug) return message.reply('Slug cannot be empty.');
      const existing = await Spirit.findOne({ slug: newSlug, _id: { $ne: spirit._id } });
      if (existing) return message.reply(`Slug \`${newSlug}\` is already used by **${existing.name}**.`);
      spirit.slug = newSlug;
    }

    if (updates.emoji !== undefined) {
      spirit.emoji = String(updates.emoji).trim();
      spirit.animatedEmoji = spirit.emoji.startsWith('<a:');
    }

    if (updates.tier !== undefined) spirit.tier = nextTier;
    if (updates.type !== undefined || updates.types !== undefined) spirit.types = nextTypes;
    if (updates.hp !== undefined || updates.atk !== undefined || updates.def !== undefined || updates.spd !== undefined) {
      spirit.baseStats = nextStats;
    }

    if (updates.active !== undefined) {
      const parsed = parseBool(updates.active);
      if (parsed === null) return message.reply('active must be true/false.');
      spirit.active = parsed;
    }

    if (updates.summonable !== undefined) {
      const parsed = parseBool(updates.summonable);
      if (parsed === null) return message.reply('summonable must be true/false.');
      spirit.summonable = parsed;
    }

    if (updates.source !== undefined) spirit.source = String(updates.source).trim() || spirit.source;

    if (updates.animated !== undefined || updates.animatedemoji !== undefined) {
      const parsed = parseBool(updates.animated ?? updates.animatedemoji);
      if (parsed === null) return message.reply('animated/animatedEmoji must be true/false.');
      spirit.animatedEmoji = parsed;
    }

    if (updates.evolved !== undefined || updates.isevolvedform !== undefined) {
      const parsed = parseBool(updates.evolved ?? updates.isevolvedform);
      if (parsed === null) return message.reply('evolved/isEvolvedForm must be true/false.');
      spirit.isEvolvedForm = parsed;
    }

    await spirit.save();

    await logEvent(client, {
      type: 'spirit_edited',
      userId: message.author.id,
      guildId: message.guild?.id || null,
      message: `Edited spirit ${spirit.name} (${spirit.slug}).`,
      data: {
        spiritId: spirit._id.toString(),
        before,
        after: {
          name: spirit.name,
          slug: spirit.slug,
          emoji: spirit.emoji,
          tier: spirit.tier,
          types: spirit.types,
          baseStats: spirit.baseStats,
          active: spirit.active,
          summonable: spirit.summonable,
          source: spirit.source,
          animatedEmoji: spirit.animatedEmoji,
          isEvolvedForm: spirit.isEvolvedForm
        }
      }
    });

    return message.reply([
      `✅ Edited ${spirit.emoji} **${spirit.name}**`,
      `Slug: \`${spirit.slug}\``,
      `Tier: **${spirit.tier}**`,
      `Type: **${spirit.types.join(' / ')}**`,
      `Stats: HP ${spirit.baseStats.hp} • ATK ${spirit.baseStats.atk} • DEF ${spirit.baseStats.def} • SPD ${spirit.baseStats.spd}`,
      `Power Score: **${powerScore(spirit.baseStats).toFixed(1)}**`,
      `Active: **${spirit.active ? 'Yes' : 'No'}** | Summonable: **${spirit.summonable ? 'Yes' : 'No'}**`
    ].join('\n'));
  }
};
