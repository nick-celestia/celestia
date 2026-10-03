const { parseArgs } = require('../../utils/args');
const { createOfficialSpirit, normalizeTier } = require('../../services/spiritService');
const { validateStatsForTier, validateTypes, powerScore } = require('../../utils/stats');

module.exports = {
  name: 'addspirit',
  aliases: ['addpet'],
  botAdminOnly: true,
  description: 'Admin: add official spirit.',
  async execute({ message, rawArgs }) {
    const parsed = parseArgs(rawArgs);
    const [name, emoji, tierRaw, type, hp, atk, def, spd] = parsed;
    if (!name || !emoji || !tierRaw || !type || !hp || !atk || !def || !spd) {
      return message.reply('Use: `c addspirit "Luna Fox" <:luna:123> Rare Light 120 20 18 22`');
    }
    const tier = normalizeTier(tierRaw);
    if (!tier || tier === 'Custom') return message.reply('Invalid tier. Use official tiers, not Custom.');
    const types = type.split('/').map((t) => t.trim()).filter(Boolean);
    const typeCheck = validateTypes(types);
    if (!typeCheck.ok) return message.reply(typeCheck.reason);
    const baseStats = { hp: Number(hp), atk: Number(atk), def: Number(def), spd: Number(spd) };
    const statCheck = validateStatsForTier(tier, baseStats);
    if (!statCheck.ok) return message.reply(statCheck.reason);

    const spirit = await createOfficialSpirit({ name, emoji, tier, types, baseStats, animatedEmoji: emoji.startsWith('<a:') });
    await message.reply(`✅ Added ${spirit.emoji} **${spirit.name}** (${tier}) with Power Score **${powerScore(baseStats).toFixed(1)}**.`);
  }
};
