const User         = require('../models/User');
const UserSpirit   = require('../models/UserSpirit');
const TeamSnapshot = require('../models/TeamSnapshot');
const { TYPE_ADVANTAGE, TYPE_EFFECTS, BATTLE_RULES, ECONOMY } = require('../config/game');
const { randomBetween }    = require('../utils/random');
const { battleStats, battlePowerScore, spiritRole, applyXp } = require('../utils/stats');
const { addBond, BOND }    = require('./bondService');
const { getOrCreateUser }  = require('./userService');
const { applyWeapon }      = require('../config/weapons');

// ── Team loader ───────────────────────────────────────────────────────────────
async function loadTeam(user) {
  const ids = [user.team.slot1, user.team.slot2, user.team.slot3].filter(Boolean);
  if (ids.length !== 3) return null;
  const owned = await UserSpirit.find({ ownerId: user.userId, shortId: { $in: ids } }).populate('spirit');
  const byId  = new Map(owned.map(s => [s.shortId, s]));
  const ordered = ids.map(id => byId.get(id));
  if (ordered.some(s => !s)) return null;
  return ordered;
}

function teamFromSnapshot(snapshot) {
  return snapshot.spirits.map(s => ({
    shortId:   s.shortId,
    level:     s.level,
    spirit:    s.spirit,
    ownerId:   snapshot.userId,
    equipment: s.equipment || {}
  }));
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

// ── Apply level cap for sim battles ──────────────────────────────────────────
// Does NOT mutate the real spirit — attaches _simLevel which spiritAttack uses
function applyLevelCap(team, levelCap) {
  if (!levelCap) return team;
  return team.map(s => ({
    ...s,
    _simLevel: Math.min(s.level, levelCap)
  }));
}

// ── Type matchup ──────────────────────────────────────────────────────────────
function matchupDetails(attackerTypes = [], defenderTypes = []) {
  for (const atk of attackerTypes) {
    const wins    = TYPE_ADVANTAGE[atk] || [];
    const defWeak = defenderTypes.find(def => wins.includes(def));
    if (defWeak) {
      const effect = TYPE_EFFECTS[atk]?.[defWeak] || null;
      return {
        advantaged: true,
        attackerType: atk, defenderType: defWeak,
        typeMultiplier:    BATTLE_RULES.typeAdvantageMultiplier,
        effectMultiplier:  BATTLE_RULES.typeEffectMultiplier,
        effectName:        effect?.name        || 'Weakness Break',
        effectDescription: effect?.description || 'Advantaged type pressure.'
      };
    }
  }
  return {
    advantaged: false, attackerType: null, defenderType: null,
    typeMultiplier: 1, effectMultiplier: 1, effectName: null, effectDescription: null
  };
}

// ── WP initialisation ─────────────────────────────────────────────────────────
function initWp(team) {
  return team.map(s => {
    const stats = battleStats(s.spirit.baseStats, s._simLevel || s.level);
    return { ...s, _wp: stats.spd };
  });
}

// ── Per-spirit attack ─────────────────────────────────────────────────────────
function spiritAttack(attacker, defender, context = {}) {
  if (attacker.shortId === 'GHOST') {
    return { power: 0, raw: 0, role: '?', matchup: { advantaged: false }, weaponLog: null };
  }

  // Use _simLevel if set (level cap sim), else real level
  const effectiveLevel = attacker._simLevel || attacker.level;
  const stats          = battleStats(attacker.spirit.baseStats, effectiveLevel);
  const raw            = battlePowerScore(stats, { weights: BATTLE_RULES.weights });
  const matchup        = matchupDetails(attacker.spirit.types, defender?.spirit?.types || []);

  const weaponResult = applyWeapon(
    attacker.equipment?.weapon,
    raw, stats, attacker, context
  );

  let finalPower = weaponResult.power;
  if (!weaponResult.ignoreDisadvantage) {
    finalPower *= matchup.typeMultiplier * matchup.effectMultiplier;
  }

  const variation = randomBetween(
    Math.round(BATTLE_RULES.randomVariationMin * 100),
    Math.round(BATTLE_RULES.randomVariationMax * 100)
  ) / 100;
  finalPower *= variation;

  return {
    power:       finalPower,
    raw, stats,
    level:       effectiveLevel,
    role:        spiritRole(stats),
    variation,   matchup,
    weaponLog:   weaponResult.log   || null,
    bonusTarget: weaponResult.target || null,
    bonusDmg:    weaponResult.bonus  || 0,
  };
}

// ── Random opponent ───────────────────────────────────────────────────────────
async function findRandomOpponent(userId) {
  const candidates = await User.find({
    userId:                  { $ne: userId },
    'team.slot1':            { $ne: null },
    'team.slot2':            { $ne: null },
    'team.slot3':            { $ne: null },
    'security.permanentBan': { $ne: true }
  }).limit(100);

  if (candidates.length) {
    return { user: candidates[randomBetween(0, candidates.length - 1)], fromSnapshot: false };
  }

  const count = await TeamSnapshot.countDocuments({ userId: { $ne: userId } });
  if (!count) return null;
  const snap = await TeamSnapshot.findOne({ userId: { $ne: userId } }).skip(randomBetween(0, count - 1));
  return snap ? { snapshot: snap, fromSnapshot: true } : null;
}

// ── Main battle ───────────────────────────────────────────────────────────────
// options.friendly  = true → skip ALL saves (XP, bond, wins, streak, mana)
// options.levelCap  = N    → cap spirit levels at N for calculation only
async function runBattle(attackerId, defenderId = null, options = {}) {
  const { friendly = false, levelCap = null } = options;

  const attacker = await getOrCreateUser(attackerId);

  let defender           = null;
  let teamBRaw           = null;
  let defenderIsSnapshot = false;

  if (defenderId) {
    defender = await getOrCreateUser(defenderId);
    teamBRaw = await loadTeam(defender);
    if (!teamBRaw) return { ok: false, reason: 'Opponent\'s team is incomplete.' };
  } else {
    const opp = await findRandomOpponent(attackerId);
    if (!opp) return { ok: false, reason: 'No opponents found yet. Set a full team first!' };

    if (opp.fromSnapshot) {
      defenderIsSnapshot = true;
      teamBRaw  = teamFromSnapshot(opp.snapshot);
      defender  = await getOrCreateUser(opp.snapshot.userId);
    } else {
      defender = opp.user;
      teamBRaw = await loadTeam(defender);
      if (!teamBRaw) return { ok: false, reason: 'Opponent\'s team is incomplete.' };
    }
  }

  const teamARaw = await loadTeam(attacker);
  if (!teamARaw) return { ok: false, reason: 'Your team is incomplete. Use `c team add` for slots 1–3.' };

  // Apply level cap (sim mode) — creates _simLevel property, doesn't touch real data
  const teamA = initWp(applyLevelCap(padTo3(teamARaw), levelCap));
  const teamB = initWp(applyLevelCap(padTo3(teamBRaw), levelCap));

  // ── 3 rounds — random targeting ───────────────────────────────────────────
  let scoreA = 0, scoreB = 0;
  const rounds = [];

  for (let round = 0; round < 3; round++) {
    const roundAttacks = [];

    for (const atk of teamA) {
      const defIdx = randomBetween(0, teamB.length - 1);
      const def    = teamB[defIdx];
      const res    = spiritAttack(atk, def, { teamScoreA: scoreA, teamScoreB: scoreB });
      scoreA      += res.power;
      roundAttacks.push({ side: 'A', attacker: atk, defender: def, defIndex: defIdx, ...res });
    }

    for (const atk of teamB) {
      const defIdx = randomBetween(0, teamA.length - 1);
      const def    = teamA[defIdx];
      const res    = spiritAttack(atk, def, { teamScoreA: scoreB, teamScoreB: scoreA });
      scoreB      += res.power;
      roundAttacks.push({ side: 'B', attacker: atk, defender: def, defIndex: defIdx, ...res });
    }

    rounds.push({ round: round + 1, attacks: roundAttacks });
  }

  // ── Outcome ───────────────────────────────────────────────────────────────
  const TIED_THRESHOLD = 10.0;
  const isTie          = Math.abs(scoreA - scoreB) <= TIED_THRESHOLD;
  const attackerWins   = !isTie && scoreA > scoreB;

  const winnerXp = ECONOMY.battleWinXp;
  const loserXp  = ECONOMY.battleLoseXp;
  const tieXp    = Math.round((winnerXp + loserXp) / 2);
  const xpA      = isTie ? tieXp : attackerWins ? winnerXp : loserXp;
  const xpB      = isTie ? tieXp : attackerWins ? loserXp  : winnerXp;
  const bondWin  = BOND.winPoints;
  const bondLoss = BOND.lossPoints;
  const bondTie  = Math.round((bondWin + bondLoss) / 2);

  // ── Save results — SKIPPED entirely if friendly = true ───────────────────
  if (!friendly) {
    // Spirit XP + bond
    for (const us of teamA) {
      if (us.shortId === 'GHOST') continue;
      const xp   = attackerWins ? winnerXp : isTie ? tieXp : loserXp;
      const bond = attackerWins ? bondWin  : isTie ? bondTie : bondLoss;
      applyXp(us, xp);
      addBond(us, bond, 1);
      await us.save();
    }
    for (const us of teamB) {
      if (us.shortId === 'GHOST' || defenderIsSnapshot) continue;
      const xp   = attackerWins ? loserXp  : isTie ? tieXp : winnerXp;
      const bond = attackerWins ? bondLoss  : isTie ? bondTie : bondWin;
      applyXp(us, xp);
      addBond(us, bond, 1);
      await us.save();
    }

    // Player stats — attacker
    if (isTie) {
      attacker.ties = (attacker.ties || 0) + 1;
    } else if (attackerWins) {
      attacker.wins += 1;
      attacker.battleStreak += 1;
      attacker.bestBattleStreak = Math.max(attacker.bestBattleStreak, attacker.battleStreak);
    } else {
      attacker.losses += 1;
      attacker.battleStreak = 0;
    }
    if (attacker.effects?.battleCharmBattles > 0) attacker.effects.battleCharmBattles -= 1;
    await attacker.save();

    // Player stats — defender (only if real online user)
    if (!defenderIsSnapshot) {
      if (isTie) {
        defender.ties = (defender.ties || 0) + 1;
      } else if (!attackerWins) {
        defender.wins += 1;
        defender.battleStreak += 1;
        defender.bestBattleStreak = Math.max(defender.bestBattleStreak, defender.battleStreak);
      } else {
        defender.losses += 1;
        defender.battleStreak = 0;
      }
      if (defender.effects?.battleCharmBattles > 0) defender.effects.battleCharmBattles -= 1;
      await defender.save();
    }

    // Streak milestone
    let milestoneReward = 0;
    if (attackerWins && attacker.battleStreak > 0 &&
        attacker.battleStreak % ECONOMY.battleStreakMilestone === 0) {
      milestoneReward      = attacker.battleStreak * ECONOMY.battleStreakManaMultiplier;
      attacker.mana       += milestoneReward;
      await attacker.save();
    }

    return {
      ok: true,
      attacker, defender, isTie, attackerWins,
      scoreA, scoreB, rounds,
      xpA, xpB,
      bondGain:       attackerWins ? bondWin : isTie ? bondTie : bondLoss,
      milestoneReward,
      defenderIsSnapshot,
      friendly: false,
      levelCap,
    };
  }

  // ── Friendly — return result without saving ANYTHING ─────────────────────
  return {
    ok: true,
    attacker, defender, isTie, attackerWins,
    scoreA, scoreB, rounds,
    xpA: 0, xpB: 0, bondGain: 0, milestoneReward: 0,
    defenderIsSnapshot: false,
    friendly: true,
    levelCap,
  };
}

module.exports = { runBattle, loadTeam, matchupDetails, spiritAttack };
