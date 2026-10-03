const { randomBytes } = require('node:crypto');
const Spirit = require('../models/Spirit');
const UserSpirit = require('../models/UserSpirit');
const { RARITY_LIMITS, RARITIES } = require('../config/game');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueShortId() {
  for (let i = 0; i < 10; i++) {
    const id = randomBytes(3).toString('hex').toUpperCase();
    const exists = await UserSpirit.exists({ shortId: id });
    if (!exists) return id;
  }
  throw new Error('Could not generate unique spirit ID');
}

async function createUserSpirit(ownerId, spiritId, obtainedBy = 'summon', extra = {}) {
  const shortId = await uniqueShortId();
  return UserSpirit.create({ ownerId, spirit: spiritId, shortId, obtainedBy, ...extra });
}

async function findOwnedSpirit(ownerId, shortId) {
  return UserSpirit.findOne({ ownerId, shortId: String(shortId).toUpperCase() }).populate('spirit');
}

function spiritDisplay(userSpirit) {
  const spirit = userSpirit.spirit;
  return `${spirit.emoji} **${userSpirit.nickname || spirit.name}** \`${userSpirit.shortId}\` • ${spirit.tier} • Lv.${userSpirit.level}`;
}

function sellValueForTier(tier) {
  return RARITY_LIMITS[tier]?.sell || 0;
}

async function createOfficialSpirit({ name, emoji, tier, types, baseStats, source = 'official', creatorId = null, animatedEmoji = false }) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let count = 1;
  while (await Spirit.exists({ slug })) {
    count += 1;
    slug = `${baseSlug}-${count}`;
  }
  return Spirit.create({ name, slug, emoji, tier, types, baseStats, source, creatorId, animatedEmoji });
}

function normalizeTier(tier) {
  if (!tier) return null;
  const found = RARITIES.find((r) => r.toLowerCase() === String(tier).toLowerCase());
  return found || null;
}

module.exports = {
  slugify,
  createUserSpirit,
  findOwnedSpirit,
  spiritDisplay,
  sellValueForTier,
  createOfficialSpirit,
  normalizeTier
};
