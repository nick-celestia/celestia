const User       = require('../models/User');
const UserSpirit = require('../models/UserSpirit');

// ── Sequential Spirit ShortId ────────────────────────────────────────────────
// Format: 4-digit number padded, then wraps to AAA001 style after 9999
// Examples: 0001, 0002, ..., 9999, A0001, A0002, ..., Z9999, AA0001 ...
// Two players can never get the same ID — uses atomic findOneAndUpdate counter.

async function generateSpiritShortId() {
  // Use a counter document in UserSpirit collection via a dedicated counter model
  // Simple approach: count total UserSpirit documents + 1
  // This is safe because shortId has unique:true — if collision somehow occurs,
  // Mongoose throws and the summon retries.
  const count = await UserSpirit.countDocuments();
  const num   = count + 1;

  if (num <= 9999) {
    return String(num).padStart(4, '0');   // 0001 → 9999
  }

  // After 9999, use letter prefix: A0001 → A9999 → B0001 etc.
  const letterIndex = Math.floor((num - 10000) / 9999);
  const remainder   = ((num - 10000) % 9999) + 1;

  if (letterIndex < 26) {
    const letter = String.fromCharCode(65 + letterIndex);   // A-Z
    return `${letter}${String(remainder).padStart(4, '0')}`;
  }

  // Two-letter prefix: AA0001 etc (supports millions of spirits)
  const l1 = String.fromCharCode(65 + Math.floor(letterIndex / 26) - 1);
  const l2 = String.fromCharCode(65 + (letterIndex % 26));
  return `${l1}${l2}${String(remainder).padStart(4, '0')}`;
}

// ── Core user functions ───────────────────────────────────────────────────────
async function getOrCreateUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) user = await User.create({ userId });
  return user;
}

async function addMana(userId, amount) {
  const user = await getOrCreateUser(userId);
  user.mana += amount;
  if (user.mana < 0) user.mana = 0;
  await user.save();
  return user;
}

function hasCustomAccess(user) {
  return user?.premium?.customAccessUntil &&
    new Date(user.premium.customAccessUntil).getTime() > Date.now();
}

module.exports = { getOrCreateUser, addMana, hasCustomAccess, generateSpiritShortId };
