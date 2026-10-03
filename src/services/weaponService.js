const PlayerWeapon = require('../models/PlayerWeapon');
const { getOrCreateUser } = require('./userService');
const { logEvent } = require('./logService');
const {
  rollWeapon, rollRandomWeapon, openCrate,
  VOTE_CRATE_INTERVAL, VOTE_CRATE_RATES, WEAPON_CRUSH_VALUES,
  pickRarity
} = require('../config/weapons');

// ── Short ID generator — e.g. WPN001, WPN042 ─────────────────────────────────
async function generateWeaponShortId() {
  const count = await PlayerWeapon.countDocuments();
  const num   = String(count + 1).padStart(4, '0');
  return `WPN${num}`;
}

// ── Grant a specific rolled weapon to a player ────────────────────────────────
async function grantWeapon(client, userId, weaponId, source = 'admin', guildId = null) {
  const rolled  = rollWeapon(weaponId);
  if (!rolled) return { ok: false, reason: `Unknown weapon: ${weaponId}` };

  const shortId = await generateWeaponShortId();

  const weapon = await PlayerWeapon.create({
    ownerId:    userId,
    weaponId:   rolled.weaponId,
    shortId,
    rolledStat: rolled.rolledStat,
    rarity:     rolled.rarity,
    crushValue: rolled.crushValue,
    source,
  });

  await logEvent(client, {
    type:    'weapon_grant',
    userId,
    guildId,
    message: `Granted weapon ${weaponId} (${shortId}) rolled ${(rolled.rolledStat * 100).toFixed(1)}% via ${source}.`,
  });

  return { ok: true, weapon, shortId, rolledStat: rolled.rolledStat };
}

// ── Grant a random weapon from a crate ───────────────────────────────────────
async function openWeaponCrate(client, userId, crateType = 'common_crate', guildId = null) {
  const rolled  = openCrate(crateType);
  if (!rolled) return { ok: false, reason: 'Invalid crate type.' };

  const shortId = await generateWeaponShortId();

  const weapon = await PlayerWeapon.create({
    ownerId:    userId,
    weaponId:   rolled.weaponId,
    shortId,
    rolledStat: rolled.rolledStat,
    rarity:     rolled.rarity,
    crushValue: rolled.crushValue,
    source:     'crate',
  });

  await logEvent(client, {
    type:    'weapon_crate',
    userId,
    guildId,
    message: `Opened ${crateType}: got ${rolled.weaponId} (${shortId}) ${(rolled.rolledStat*100).toFixed(1)}%.`,
  });

  return { ok: true, weapon, shortId, rolledStat: rolled.rolledStat };
}

// ── Vote crate check — call after every vote is recorded ─────────────────────
// Returns a crate result if this vote triggered one, otherwise null
async function checkVoteCrate(client, userId, totalVotes) {
  if (totalVotes % VOTE_CRATE_INTERVAL !== 0) return null;

  const rarity    = pickRarity(VOTE_CRATE_RATES);
  const crateType = `${rarity.replace(' ', '_').toLowerCase()}_crate`;
  const result    = await openWeaponCrate(client, userId, crateType);

  return result.ok ? result : null;
}

// ── Crush a weapon — returns Forge Shards ────────────────────────────────────
async function crushWeapon(client, userId, weaponShortId) {
  const weapon = await PlayerWeapon.findOne({ ownerId: userId, shortId: weaponShortId });
  if (!weapon) return { ok: false, reason: `You do not own weapon \`${weaponShortId}\`.` };

  if (weapon.equippedOn) {
    return { ok: false, reason: `Unequip \`${weaponShortId}\` from ${weapon.equippedOn} before crushing.` };
  }

  const shards = weapon.crushValue;

  // Add Forge Shards to player
  const user = await getOrCreateUser(userId);
  user.forgeShards = (user.forgeShards || 0) + shards;
  await user.save();

  await weapon.deleteOne();

  await logEvent(client, {
    type:    'weapon_crush',
    userId,
    guildId: null,
    message: `Crushed ${weaponShortId} (${weapon.weaponId}) for ${shards} Forge Shards.`,
  });

  return { ok: true, shards, weaponName: weapon.weaponId };
}

// ── Crush all weapons of a rarity ────────────────────────────────────────────
async function crushByRarity(client, userId, rarity) {
  const weapons = await PlayerWeapon.find({
    ownerId: userId,
    rarity,
    equippedOn: null,   // skip equipped
  });

  if (!weapons.length) {
    return { ok: false, reason: `No unequipped ${rarity} weapons to crush.` };
  }

  const totalShards = weapons.reduce((sum, w) => sum + w.crushValue, 0);
  await PlayerWeapon.deleteMany({ _id: { $in: weapons.map(w => w._id) } });

  const user = await getOrCreateUser(userId);
  user.forgeShards = (user.forgeShards || 0) + totalShards;
  await user.save();

  await logEvent(client, {
    type:    'weapon_crush',
    userId,
    guildId: null,
    message: `Bulk crushed ${weapons.length} ${rarity} weapons for ${totalShards} Forge Shards.`,
  });

  return { ok: true, shards: totalShards, count: weapons.length, rarity };
}

// ── Reroll a weapon's stat using Forge Shards ────────────────────────────────
const REROLL_COSTS = {
  Common:    5,
  Uncommon:  12,
  Rare:      25,
  Epic:      60,
  Legendary: 150,
  Mythic:    999,   // effectively not rerollable
};

async function rerollWeapon(client, userId, weaponShortId) {
  const weapon = await PlayerWeapon.findOne({ ownerId: userId, shortId: weaponShortId });
  if (!weapon) return { ok: false, reason: `You do not own weapon \`${weaponShortId}\`.` };
  if (weapon.rarity === 'Mythic') return { ok: false, reason: 'Mythic weapons cannot be rerolled.' };

  const cost = REROLL_COSTS[weapon.rarity] || 999;
  const user = await getOrCreateUser(userId);

  if ((user.forgeShards || 0) < cost) {
    return { ok: false, reason: `You need **${cost} Forge Shards** to reroll a ${weapon.rarity} weapon. You have ${user.forgeShards || 0}.` };
  }

  const freshRoll = rollWeapon(weapon.weaponId);
  const oldStat   = weapon.rolledStat;

  weapon.rolledStat = freshRoll.rolledStat;
  await weapon.save();

  user.forgeShards -= cost;
  await user.save();

  return {
    ok: true,
    oldStat,
    newStat:  freshRoll.rolledStat,
    improved: freshRoll.rolledStat > oldStat,
    cost,
  };
}

// ── Load weapon data for battle (used by battleService) ──────────────────────
async function loadWeaponForBattle(ownerId, weaponShortId) {
  if (!weaponShortId) return null;
  const weapon = await PlayerWeapon.findOne({ ownerId, shortId: weaponShortId });
  return weapon || null;
}

module.exports = {
  grantWeapon,
  openWeaponCrate,
  checkVoteCrate,
  crushWeapon,
  crushByRarity,
  rerollWeapon,
  loadWeaponForBattle,
  REROLL_COSTS,
};
