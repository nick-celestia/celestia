const { SHOP_ITEMS, ECONOMY } = require('../config/game');
const { getOrCreateUser } = require('./userService');

function normalizeItem(input) {
  if (!input) return null;
  const key = input.toLowerCase().replace(/\s+/g, '_');
  if (SHOP_ITEMS[key]) return key;
  const found = Object.entries(SHOP_ITEMS).find(([, item]) => item.name.toLowerCase() === input.toLowerCase());
  return found ? found[0] : key;
}

async function buyItem(userId, itemKey) {
  const key = normalizeItem(itemKey);
  const item = SHOP_ITEMS[key];
  if (!item) return { ok: false, reason: 'Unknown shop item.' };

  const user = await getOrCreateUser(userId);
  if (user.mana < item.price) return { ok: false, reason: `You need ${item.price} Mana to buy ${item.name}.` };

  user.mana -= item.price;
  user.items[key] = (user.items[key] || 0) + 1;
  await user.save();
  return { ok: true, user, item, key };
}

async function useItem(userId, itemKey) {
  const key = normalizeItem(itemKey);
  const user = await getOrCreateUser(userId);
  if (!user.items[key] || user.items[key] <= 0) return { ok: false, reason: `You do not own ${key}.` };

  if (key === 'lucky_star') {
    user.items[key] -= 1;
    user.effects.luckyStarSummons += ECONOMY.luckyStarSummons;
    await user.save();
    return { ok: true, message: `🌟 Lucky Star activated! Your next ${ECONOMY.luckyStarSummons} summons have boosted luck.` };
  }

  if (key === 'battle_charm') {
    user.items[key] -= 1;
    user.effects.battleCharmBattles += ECONOMY.battleCharmBattles;
    await user.save();
    return { ok: true, message: `⚔️ Battle Charm activated! Your next ${ECONOMY.battleCharmBattles} battles give 2x spirit XP.` };
  }

  return { ok: false, reason: 'This item needs a specific command. Rename Scroll is used through `c rename <spiritId> <new name>`.' };
}

module.exports = { normalizeItem, buyItem, useItem };
