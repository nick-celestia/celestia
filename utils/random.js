const { randomInt } = require('node:crypto');

function randomBetween(min, maxInclusive) {
  return randomInt(min, maxInclusive + 1);
}

function chance(percent) {
  return randomBetween(1, 10_000) <= Math.round(percent * 100);
}

function weightedPick(weightMap) {
  const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  if (total <= 0) throw new Error('weightedPick requires positive weights');

  const scaledTotal = Math.round(total * 1000);
  let roll = randomInt(1, scaledTotal + 1);

  for (const [key, weight] of entries) {
    roll -= Math.round(Number(weight) * 1000);
    if (roll <= 0) return key;
  }

  return entries[entries.length - 1][0];
}

module.exports = { randomBetween, chance, weightedPick };
