const User = require('../models/User');

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
  return user?.premium?.customAccessUntil && new Date(user.premium.customAccessUntil).getTime() > Date.now();
}

module.exports = { getOrCreateUser, addMana, hasCustomAccess };
