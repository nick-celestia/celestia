// Merged: bond_progression_balance_patch (quadratic curve) +
//         constellation_bond_sanctuary_patch (addBond, battlesTogether)
//
// The bond_balance patch has the better progression curve (quadratic, much
// longer grind). The constellation patch only added bondTitle milestones
// which are also in bond_balance. bond_balance wins on all points.

const BOND = {
  winPoints:  5,
  lossPoints: 1,   // bond_balance uses 1 (harder), constellation used 2 — use 1
  maxLevel:   100,

  // Quadratic progression: pointsRequired = levelCurve × (level - 1)²
  // Level 10  →    900 pts  (~90 battles as winner)
  // Level 25  →  5,900 pts
  // Level 50  → 24,500 pts
  // Level 75  → 54,900 pts
  // Level 100 → 98,010 pts
  levelCurve: 100
};

function pointsRequiredForLevel(level) {
  const safe = Math.max(1, Math.min(BOND.maxLevel, Number(level) || 1));
  return BOND.levelCurve * Math.pow(safe - 1, 2);
}

function bondLevelForPoints(points) {
  const safe = Math.max(0, Number(points) || 0);
  const calc = 1 + Math.floor(Math.sqrt(safe / BOND.levelCurve));
  return Math.min(BOND.maxLevel, Math.max(1, calc));
}

function pointsForNextBondLevel(level) {
  const safe = Math.max(1, Number(level) || 1);
  if (safe >= BOND.maxLevel) return null;
  return pointsRequiredForLevel(safe + 1);
}

function bondTitle(level) {
  const v = Number(level) || 1;
  if (v >= 100) return 'Astral Soulmate';
  if (v >= 90)  return 'Eternal Resonance';
  if (v >= 75)  return 'Soulbound';
  if (v >= 60)  return 'Devoted';
  if (v >= 40)  return 'Trusted';
  if (v >= 20)  return 'Familiar';
  return 'Newly Met';
}

function addBond(userSpirit, amount, battles = 1) {
  userSpirit.bondPoints      = Math.max(0, (userSpirit.bondPoints      || 0) + amount);
  userSpirit.battlesTogether = Math.max(0, (userSpirit.battlesTogether || 0) + battles);
  userSpirit.bondLevel       = bondLevelForPoints(userSpirit.bondPoints);
  return userSpirit.bondLevel;
}

module.exports = {
  BOND,
  pointsRequiredForLevel,
  bondLevelForPoints,
  pointsForNextBondLevel,
  bondTitle,
  addBond
};
