const User         = require('../models/User');
const UserSpirit   = require('../models/UserSpirit');
const TeamSnapshot = require('../models/TeamSnapshot');
const { TYPE_ADVANTAGE, TYPE_EFFECTS, BATTLE_RULES, ECONOMY } = require('../config/game');
const { randomBetween }    = require('../utils/random');
const { battleStats, battlePowerScore, spiritRole, applyXp } = require('../utils/stats');
const { addBond, BOND }    = require('./bondService');
const { getOrCreateUser }  = require('./userService');

// Safe weapon import — doesn't crash if weapons not deployed
let applyWeapon = function(id, power) { return { power: power, log: null }; };
try { applyWeapon = require('../config/weapons').applyWeapon; } catch {}

// ── Team loader — always populate spirit ─────────────────────────────────────
async function loadTeam(user) {
  const ids = [user.team.slot1, user.team.slot2, user.team.slot3].filter(Boolean);
  if (ids.length !== 3) return null;

  const owned = await UserSpirit
    .find({ ownerId: user.userId, shortId: { $in: ids } })
    .populate('spirit');   // ← critical: must populate

  const byId    = new Map(owned.map(s => [s.shortId, s]));
  const ordered = ids.map(id => byId.get(id));

  // Guard: reject team if any spirit failed to populate
  if (ordered.some(s => !s || !s.spirit || !s.spirit.baseStats)) return null;
  return ordered;
}

// ── Snapshot → team ───────────────────────────────────────────────────────────
function teamFromSnapshot(snapshot) {
  return snapshot.spirits.map(s => {
    const spiritData = s.spirit?.toObject ? s.spirit.toObject() : (s.spirit || {});
    return {
      shortId:    s.shortId   || 'SNAP',
      level:      s.level     || 1,
      ownerId:    snapshot.userId,
      equipment:  s.equipment || {},
      bondPoints: s.bondPoints || 0,
      spirit: {
        name:      spiritData.name      || '???',
        emoji:     spiritData.emoji     || '✨',
        types:     spiritData.types     || [],
        baseStats: spiritData.baseStats || { hp: 50, atk: 10, def: 10, spd: 10 },
      }
    };
  });
}

// ── Ghost placeholder ─────────────────────────────────────────────────────────
const GHOST = {
  shortId:   'GHOST',
  level:     1,
  spirit:    { name: '???', emoji: '👻', types: [], baseStats: { hp: 1, atk: 1, def: 1, spd: 1 } },
  equipment: {}
};

function padTo3(team) {
  if (!team) return [{ ...GHOST }, { ...GHOST }, { ...GHOST }];
  const out = [...team];
  while (out.length < 3) out.push({ ...GHOST });
  return out;
}

function applyLevelCap(team, levelCap) {
  if (!levelCap) return team;
  return team.map(s => ({ ...s, _simLevel: Math.min(s.level, levelCap) }));
}

// ── Type matchup ──────────────────────────────────────────────────────────────
function matchupDetails(attackerTypes = [], defenderTypes = []) {
  for (const atk of attackerTypes) {
    const wins    = TYPE_ADVANTAGE[atk] || [];
    const defWeak = defenderTypes.find(def => wins.includes(def));
    if (defWeak) {
      const effect = TYPE_EFFECTS[atk]?.[defWeak] || null;
      return {
        advantaged: true, attackerType: atk, defenderType: defWeak,
        typeMultiplier:    BATTLE_RULES.typeAdvantageMultiplier,
        effectMultiplier:  BATTLE_RULES.typeEffectMultiplier,
        effectName:        effect?.name        || 'Weakness Break',
        effectDescription: effect?.description || 'Advantaged type pressure.'
      };
    }
  }
  return { advantaged: false, attackerType: null, defenderType: null, typeMultiplier: 1, effectMultiplier: 1, effectName: null, effectDescription: null };
}

// ── WP initialisation — null-safe ─────────────────────────────────────────────
function initWp(team) {
  return team.map(s => {
    // Guard: ghost or missing spirit gets 0 WP
    if (s.shortId === 'GHOST' || !s.spirit?.baseStats) return { ...s, _wp: 0 };
    const stats = battleStats(s.spirit.baseStats, s._simLevel || s.level);
    return { ...s, _wp: stats.spd };
  });
}

// ── Per-spirit attack — null-safe ─────────────────────────────────────────────
function spiritAttack(attacker, defender, context = {}) {
  if (attacker.shortId === 'GHOST') {
    return { power: 0, raw: 0, role: '?', matchup: { advantaged: false }, weaponLog: null };
  }

  // Guard: if spirit or baseStats missing, treat as ghost
  if (!attacker.spirit?.baseStats) {
    console.warn('[Battle] Spirit missing baseStats for shortId:', attacker.shortId);
    return { power: 0, raw: 0, role: '?', matchup: { advantaged: false }, weaponLog: 'missing data' };
  }

  const effectiveLevel = attacker._simLevel || attacker.level;
  const stats          = battleStats(attacker.spirit.baseStats, effectiveLevel);
  const raw            = battlePowerScore(stats, { weights: BATTLE_RULES.weights });
  const matchup        = matchupDetails(attacker.spirit.types, defender?.spirit?.types || []);

  const weaponResult = applyWeapon(attacker.equipment?.weapon, raw, stats, attacker, context);

  let finalPower = weaponResult.power;
  if (!weaponResult.ignoreDisadvantage) finalPower *= matchup.typeMultiplier * matchup.effectMultiplier;

  const variation = randomBetween(
    Math.round(BATTLE_RULES.randomVariationMin * 100),
    Math.round(BATTLE_RULES.randomVariationMax * 100)
  ) / 100;
  finalPower *= variation;

  return {
    power: finalPower, raw, stats,
    level: effectiveLevel,
    role: spiritRole(stats),
    variation, matchup,
    weaponLog:   weaponResult.log    || null,
    bonusTarget: weaponResult.target || null,
    bonusDmg:    weaponResult.bonus  || 0,
  };
}

// ── Random opponent ───────────────────────────────────────────────────────────
async function findRandomOpponent(userId) {
  const candidates = await User.find({
    userId: { $ne: userId },
    'team.slot1': { $ne: null }, 'team.slot2': { $ne: null }, 'team.slot3': { $ne: null },
    'security.permanentBan': { $ne: true }
  }).limit(100);

  if (candidates.length) return { user: candidates[randomBetween(0, candidates.length - 1)], fromSnapshot: false };

  const count = await TeamSnapshot.countDocuments({ userId: { $ne: userId } });
  if (!count) return null;
  const snap = await TeamSnapshot.findOne({ userId: { $ne: userId } }).skip(randomBetween(0, count - 1));
  return snap ? { snapshot: snap, fromSnapshot: true } : null;
}

// ── Main battle ───────────────────────────────────────────────────────────────
// ── Safe save helper ─────────────────────────────────────────────────────────
// Mongoose docs have .save(), plain objects (snapshots) don't.
// Use updateOne as fallback so XP/bond still persists for snapshot spirits.
async function safeSave(us) {
  try {
    if (typeof us.save === 'function') {
      await safeSave(us);
    } else {
      await UserSpirit.updateOne(
        { shortId: us.shortId, ownerId: us.ownerId },
        { $set: { level: us.level, xp: us.xp, bondPoints: us.bondPoints, bondLevel: us.bondLevel, battlesTogether: us.battlesTogether } }
      );
    }
  } catch (err) {
    console.error('[Battle] safeSave failed for', us.shortId, err.message);
  }
}

async function runBattle(attackerId, defenderId = null, options = {}) {
  const { friendly = false, levelCap = null } = options;
  const attacker = await getOrCreateUser(attackerId);

  let defender = null, teamBRaw = null, defenderIsSnapshot = false;

  if (defenderId) {
    defender = await getOrCreateUser(defenderId);
    teamBRaw = await loadTeam(defender);
    if (!teamBRaw) return { ok: false, reason: 'Opponent\'s team is incomplete or has invalid spirits.' };
  } else {
    const opp = await findRandomOpponent(attackerId);
    if (!opp) return { ok: false, reason: 'No opponents found. Be the first to set a full team!' };

    if (opp.fromSnapshot) {
      defenderIsSnapshot = true;
      teamBRaw = teamFromSnapshot(opp.snapshot);
      defender = await getOrCreateUser(opp.snapshot.userId);
    } else {
      defender = opp.user;
      teamBRaw = await loadTeam(defender);
      if (!teamBRaw) return { ok: false, reason: 'Opponent\'s team is incomplete.' };
    }
  }

  const teamARaw = await loadTeam(attacker);
  if (!teamARaw) return { ok: false, reason: 'Your team is incomplete. Use `c team add` for all 3 slots.' };

  const teamA = initWp(applyLevelCap(padTo3(teamARaw), levelCap));
  const teamB = initWp(applyLevelCap(padTo3(teamBRaw), levelCap));

  let scoreA = 0, scoreB = 0;
  const rounds = [];

  for (let round = 0; round < 3; round++) {
    const roundAttacks = [];
    for (const atk of teamA) {
      const def = teamB[randomBetween(0, teamB.length - 1)];
      const res = spiritAttack(atk, def, { teamScoreA: scoreA, teamScoreB: scoreB });
      scoreA += res.power;
      roundAttacks.push({ side: 'A', attacker: atk, defender: def, ...res });
    }
    for (const atk of teamB) {
      const def = teamA[randomBetween(0, teamA.length - 1)];
      const res = spiritAttack(atk, def, { teamScoreA: scoreB, teamScoreB: scoreA });
      scoreB += res.power;
      roundAttacks.push({ side: 'B', attacker: atk, defender: def, ...res });
    }
    rounds.push({ round: round + 1, attacks: roundAttacks });
  }

  const TIED_THRESHOLD = 10.0;
  const isTie        = Math.abs(scoreA - scoreB) <= TIED_THRESHOLD;
  const attackerWins = !isTie && scoreA > scoreB;

  const winnerXp = ECONOMY.battleWinXp;
  const loserXp  = ECONOMY.battleLoseXp;
  const tieXp    = Math.round((winnerXp + loserXp) / 2);
  const xpA      = isTie ? tieXp : attackerWins ? winnerXp : loserXp;
  const xpB      = isTie ? tieXp : attackerWins ? loserXp  : winnerXp;
  const bondWin  = BOND.winPoints;
  const bondLoss = BOND.lossPoints;
  const bondTie  = Math.round((bondWin + bondLoss) / 2);

  if (!friendly) {
    for (const us of teamA) {
      if (us.shortId === 'GHOST') continue;
      applyXp(us, attackerWins ? winnerXp : isTie ? tieXp : loserXp);
      addBond(us, attackerWins ? bondWin : isTie ? bondTie : bondLoss, 1);
      await safeSave(us);
    }
    for (const us of teamB) {
      if (us.shortId === 'GHOST' || defenderIsSnapshot) continue;
      applyXp(us, attackerWins ? loserXp : isTie ? tieXp : winnerXp);
      addBond(us, attackerWins ? bondLoss : isTie ? bondTie : bondWin, 1);
      await safeSave(us);
    }

    if (isTie) { attacker.ties = (attacker.ties || 0) + 1; }
    else if (attackerWins) {
      attacker.wins += 1; attacker.battleStreak += 1;
      attacker.bestBattleStreak = Math.max(attacker.bestBattleStreak, attacker.battleStreak);
    } else { attacker.losses += 1; attacker.battleStreak = 0; }
    if (attacker.effects?.battleCharmBattles > 0) attacker.effects.battleCharmBattles -= 1;
    await attacker.save();

    if (!defenderIsSnapshot) {
      if (isTie) { defender.ties = (defender.ties || 0) + 1; }
      else if (!attackerWins) {
        defender.wins += 1; defender.battleStreak += 1;
        defender.bestBattleStreak = Math.max(defender.bestBattleStreak, defender.battleStreak);
      } else { defender.losses += 1; defender.battleStreak = 0; }
      if (defender.effects?.battleCharmBattles > 0) defender.effects.battleCharmBattles -= 1;
      await defender.save();
    }

    let milestoneReward = 0;
    if (attackerWins && attacker.battleStreak > 0 && attacker.battleStreak % ECONOMY.battleStreakMilestone === 0) {
      milestoneReward = attacker.battleStreak * ECONOMY.battleStreakManaMultiplier;
      attacker.mana  += milestoneReward;
      await attacker.save();
    }

    return { ok: true, attacker, defender, isTie, attackerWins, scoreA, scoreB, rounds, xpA, xpB, bondGain: attackerWins ? bondWin : isTie ? bondTie : bondLoss, milestoneReward, defenderIsSnapshot, friendly: false, levelCap };
  }

  return { ok: true, attacker, defender, isTie, attackerWins, scoreA, scoreB, rounds, xpA: 0, xpB: 0, bondGain: 0, milestoneReward: 0, defenderIsSnapshot: false, friendly: true, levelCap };
}

module.exports = { runBattle, loadTeam, matchupDetails, spiritAttack };
