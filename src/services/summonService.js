const Spirit = require('../models/Spirit');
const { SUMMON_RATES, ECONOMY } = require('../config/game');
const { weightedPick, randomBetween } = require('../utils/random');
const { getOrCreateUser, hasCustomAccess } = require('./userService');
const { createUserSpirit } = require('./spiritService');
const { awardPlayerXp, PLAYER_XP } = require('./playerLevelService');

async function summon(userId) {
  const user = await getOrCreateUser(userId);
  if (user.mana < ECONOMY.summonCost) {
    return { ok: false, reason: `You need ${ECONOMY.summonCost} Mana to summon. Use \`c daily\` or sell duplicate spirits.` };
  }

  // Replace the rates selection block with this:
const hasKey      = hasCustomAccess(user);
const hasLuckyStar = user.effects.luckyStarSummons > 0;

let rates;
if (hasKey && hasLuckyStar) {
  // Key + Lucky Star: merge boosted rates with fixed Custom rate
  rates = {
    ...SUMMON_RATES.luckyStar,      // boosted Common/Uncommon/Rare/Epic/Legendary/etc
    Custom: SUMMON_RATES.customAccess.Custom  // Custom fixed at key rate (2%), not lucky star rate
  };
} else if (hasKey) {
  rates = SUMMON_RATES.customAccess;          // key only — Custom at 2%
} else if (hasLuckyStar) {
  // Lucky Star but NO key — use luckyStar rates but strip Custom entirely
  const { Custom, ...noCustom } = SUMMON_RATES.luckyStar;
  rates = noCustom;
} else {
  rates = SUMMON_RATES.normal;                // no key, no Lucky Star
}

  let tier = weightedPick(rates);
  let pool = await Spirit.find({ active: true, summonable: true, tier });

  if (!pool.length) {
    // Fallback keeps the bot alive if a tier has no spirits yet.
    pool = await Spirit.find({ active: true, summonable: true, tier: { $nin: ['Custom', 'Ascended'] } });
    if (!pool.length) return { ok: false, reason: 'No summonable spirits exist yet. Ask an admin to run the seed command or add spirits.' };
    tier = 'Fallback';
  }

  const spirit = pool[randomBetween(0, pool.length - 1)];
  const userSpirit = await createUserSpirit(userId, spirit._id, 'summon');

  user.mana -= ECONOMY.summonCost;
  user.summonCount += 1;
  if (user.effects.luckyStarSummons > 0) user.effects.luckyStarSummons -= 1;
  await user.save();

  awardPlayerXp(user, PLAYER_XP.summon);
  await user.save();

  return { ok: true, spirit, userSpirit, user, tierRolled: tier };
}

module.exports = { summon };
