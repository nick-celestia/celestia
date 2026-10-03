const mongoose = require('mongoose');

// Each document = one physical weapon copy owned by a player.
// Multiple copies of same type have different shortIds and different rolledStat.
// Mirrors how UserSpirit works for spirits.

const playerWeaponSchema = new mongoose.Schema({
  ownerId:    { type: String, required: true, index: true },

  // Weapon type slug — matches key in weapons.js config
  weaponId:   { type: String, required: true },

  // Unique short ID for this specific copy — e.g. WPN001, WPN042
  // Players use this to equip: c equip EMB1 weapon WPN042
  shortId:    { type: String, required: true, unique: true },

  // The rolled stat for this copy (percentage as decimal, e.g. 0.127 = 12.7%)
  // Determined once at acquisition, never changes unless rerolled with Forge Shards
  rolledStat: { type: Number, required: true },

  // Rarity of this weapon copy — determines crush value and reroll cost
  rarity:     { type: String, required: true },

  // Whether this copy is currently equipped on a spirit
  equippedOn: { type: String, default: null },  // shortId of spirit, or null

  // Source of acquisition
  source:     { type: String, default: 'crate' },  // 'crate' | 'event' | 'admin' | 'craft'

  // Forge Shards value if crushed
  crushValue: { type: Number, default: 1 },

}, { timestamps: true });

playerWeaponSchema.index({ ownerId: 1, weaponId: 1 });
playerWeaponSchema.index({ ownerId: 1, shortId: 1 });

module.exports = mongoose.models.PlayerWeapon
  || mongoose.model('PlayerWeapon', playerWeaponSchema);
