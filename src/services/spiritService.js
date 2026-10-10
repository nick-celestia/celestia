const { randomBytes }  = require('crypto');
const Spirit           = require('../models/Spirit');
const UserSpirit       = require('../models/UserSpirit');
const { RARITIES, RARITY_LIMITS } = require('../config/game');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Sequential spirit short ID ────────────────────────────────────────────────
// Format: 0001 → 9999 → A0001 → A9999 → B0001 → ... → Z9999 → AA0001 ...
// Uses total count so IDs are always increasing and never random.
// The unique index on shortId catches any race condition automatically.
async function generateSequentialShortId() {
  const count = await UserSpirit.countDocuments();
  const num   = count + 1;

  if (num <= 9999) {
    return String(num).padStart(4, '0');
  }

  const letterIndex = Math.floor((num - 10000) / 9999);
  const remainder   = ((num - 10000) % 9999) + 1;

  if (letterIndex < 26) {
    return String.fromCharCode(65 + letterIndex) + String(remainder).padStart(4, '0');
  }

  const l1 = String.fromCharCode(65 + Math.floor(letterIndex / 26) - 1);
  const l2 = String.fromCharCode(65 + (letterIndex % 26));
  return `${l1}${l2}${String(remainder).padStart(4, '0')}`;
}

// Kept as fallback only — should not be needed with sequential IDs
async function uniqueShortId() {
  return generateSequentialShortId();
}

async function createUserSpirit(ownerId, spiritId, obtainedBy = 'summon', extra = {}) {
  const shortId = await generateSequentialShortId();
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
  return RARITIES.find(r => r.toLowerCase() === String(tier).toLowerCase()) || null;
}

module.exports = {
  slugify,
  createUserSpirit,
  findOwnedSpirit,
  spiritDisplay,
  sellValueForTier,
  createOfficialSpirit,
  normalizeTier,
  generateSequentialShortId,
};
