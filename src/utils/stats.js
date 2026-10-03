const { RARITY_LIMITS, TYPES } = require('../config/game');

function powerScore(stats) {
  return stats.hp / 5 + stats.atk + stats.def + stats.spd;
}

function validateStatsForTier(tier, stats) {
  const limits = RARITY_LIMITS[tier];
  if (!limits) return { ok: false, reason: `Unknown tier: ${tier}` };

  const values = ['hp', 'atk', 'def', 'spd'];
  for (const key of values) {
    if (!Number.isFinite(stats[key]) || stats[key] <= 0) {
      return { ok: false, reason: `${key.toUpperCase()} must be a positive number.` };
    }
  }

  if (stats.hp > limits.maxHp) return { ok: false, reason: `HP cannot exceed ${limits.maxHp} for ${tier}.` };
  if (stats.atk > limits.maxAtk) return { ok: false, reason: `ATK cannot exceed ${limits.maxAtk} for ${tier}.` };
  if (stats.def > limits.maxDef) return { ok: false, reason: `DEF cannot exceed ${limits.maxDef} for ${tier}.` };
  if (stats.spd > limits.maxSpd) return { ok: false, reason: `SPD cannot exceed ${limits.maxSpd} for ${tier}.` };

  const score = powerScore(stats);
  if (score > limits.maxPower) {
    return {
      ok: false,
      reason: `Power Score ${score.toFixed(1)} exceeds ${limits.maxPower} for ${tier}. Formula: HP/5 + ATK + DEF + SPD.`
    };
  }

  return { ok: true, score };
}

function battleStats(baseStats, level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return {
    hp: baseStats.hp + (safeLevel - 1) * 5,
    atk: baseStats.atk + (safeLevel - 1),
    def: baseStats.def + (safeLevel - 1),
    spd: baseStats.spd + Math.floor((safeLevel - 1) / 2)
  };
}

function xpNeededForLevel(level) {
  return 500 + (level - 1) * 75;
}

function applyXp(userSpirit, amount) {
  userSpirit.xp += amount;
  let leveled = 0;
  while (userSpirit.xp >= xpNeededForLevel(userSpirit.level)) {
    userSpirit.xp -= xpNeededForLevel(userSpirit.level);
    userSpirit.level += 1;
    leveled += 1;
  }
  return leveled;
}

function battlePowerScore(stats, options = {}) {
  const weights = options.weights || { hp: 0.2, atk: 2, def: 1.4, spd: 1.2 };
  return stats.hp * weights.hp + stats.atk * weights.atk + stats.def * weights.def + stats.spd * weights.spd;
}

function spiritRole(stats) {
  const atkScore = stats.atk * 2;
  const guardScore = stats.def * 1.4 + stats.hp * 0.12;
  const speedScore = stats.spd * 1.8;
  const max = Math.max(atkScore, guardScore, speedScore);
  const close = [atkScore, guardScore, speedScore].filter((v) => max - v <= 4).length;
  if (close >= 2) return 'Balanced';
  if (max === atkScore) return 'Striker';
  if (max === guardScore) return 'Guardian';
  return 'Swift';
}

function validateTypes(types) {
  if (!Array.isArray(types) || types.length < 1 || types.length > 2) {
    return { ok: false, reason: 'Spirit must have 1 or 2 types.' };
  }
  for (const type of types) {
    if (!TYPES.includes(type)) return { ok: false, reason: `Invalid type: ${type}. Allowed: ${TYPES.join(', ')}` };
  }
  return { ok: true };
}

module.exports = {
  powerScore,
  validateStatsForTier,
  battleStats,
  battlePowerScore,
  spiritRole,
  xpNeededForLevel,
  applyXp,
  validateTypes
};
