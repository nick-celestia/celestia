// ─────────────────────────────────────────────────────────────────────────────
// Celestia Player Level Service — Final Balanced Version
// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT LEVEL XP FORMULA: totalXp(N) = 126 × (N-1)²
//
// Target pacing (with 300 XP daily cap, playing regularly):
//   Level 10  →  35 days   (~1 month)
//   Level 20  → 152 days   (~5 months)
//   Level 30  → 354 days   (~1 year)
//   Level 60  → 1463 days  (~4 years)   ← "takes years" milestone
//   Level 75  → 2300 days  (~6 years)
//   Level 100 → 4117 days  (~11 years)
//
// Casual players (80 XP/day):
//   Level 30  → 3.6 years
//   Level 60  → 15 years
//
// XP SOURCES: command-triggered only, not per-action.
//   Each eligible command grants XP with a 60s cooldown per player.
//   A daily cap of 300 XP hard-stops grants once reached.
//   Spamming commands gives 0 XP after the cooldown blocks.
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_LEVEL_CURVE = 126;
const MAX_PLAYER_LEVEL   = 100;
const DAILY_XP_CAP       = 300;
const XP_COOLDOWN_MS     = 60_000;   // 60 seconds between grants

// ── Formula ───────────────────────────────────────────────────────────────────
function totalXpForLevel(level) {
  const safe = Math.max(1, Math.min(MAX_PLAYER_LEVEL, level));
  return PLAYER_LEVEL_CURVE * Math.pow(safe - 1, 2);
}

function levelFromXp(totalXp) {
  const safe = Math.max(0, totalXp);
  const calc = 1 + Math.floor(Math.sqrt(safe / PLAYER_LEVEL_CURVE));
  return Math.min(MAX_PLAYER_LEVEL, Math.max(1, calc));
}

function xpToNextLevel(totalXp) {
  const current = levelFromXp(totalXp);
  if (current >= MAX_PLAYER_LEVEL) return null;
  return totalXpForLevel(current + 1) - totalXp;
}

function levelProgress(totalXp) {
  const level = levelFromXp(totalXp);
  if (level >= MAX_PLAYER_LEVEL) return 1.0;
  const thisLvl = totalXpForLevel(level);
  const nextLvl = totalXpForLevel(level + 1);
  return Math.min(1.0, (totalXp - thisLvl) / (nextLvl - thisLvl));
}

// ── Prestige titles ───────────────────────────────────────────────────────────
function playerTitle(level) {
  if (level >= 100) return 'Celestial Sovereign';
  if (level >= 90)  return 'Astral Master';
  if (level >= 75)  return 'Void Walker';
  if (level >= 60)  return 'Constellation Sage';
  if (level >= 50)  return 'Spirit Elder';
  if (level >= 40)  return 'Bond Keeper';
  if (level >= 30)  return 'Spirit Caller';
  if (level >= 20)  return 'Summoner';
  if (level >= 10)  return 'Apprentice';
  return 'Wanderer';
}

// ── Visual progress bar ───────────────────────────────────────────────────────
function progressBar(totalXp, width = 20) {
  const pct    = levelProgress(totalXp);
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── XP amounts per command ────────────────────────────────────────────────────
// These are the amounts granted when a command is successfully executed.
// The cooldown and daily cap in awardPlayerXp() enforce the actual limits.
const PLAYER_XP = {
  battle:   6,    // any battle result (win/loss/tie)
  daily:    20,   // daily claim
  summon:   3,    // per summon
  team:     2,    // team add or remove
  bond:     1,    // viewing bond or bond progress
  sanctuary:1,    // sanctuary view
  evolve:   15,   // evolution (rare enough to give more)
  stardustSpend: 0,  // no XP from stardust — purely economic action
};

// ── In-memory cooldown tracker ────────────────────────────────────────────────
// Key: userId, Value: { lastGrantAt: timestamp, dailyXp: number, dayKey: string }
// This resets per bot restart (intentional — no DB overhead for cooldown tracking).
// DayKey format: 'YYYY-MM-DD' UTC so it resets at midnight UTC naturally.
const xpCooldowns = new Map();

function getDayKey() {
  return new Date().toISOString().slice(0, 10);  // '2026-09-04'
}

// ── Main XP award function ────────────────────────────────────────────────────
// Returns { granted, amount, leveled, oldLevel, newLevel, reason }
function awardPlayerXp(user, commandKey) {
  const amount = PLAYER_XP[commandKey] || 0;
  if (amount <= 0) return { granted: false, amount: 0, reason: 'no_xp_for_command' };

  const userId  = user.userId;
  const now     = Date.now();
  const dayKey  = getDayKey();

  // Get or create session for this user
  let session = xpCooldowns.get(userId);
  if (!session || session.dayKey !== dayKey) {
    // New day or new session — reset daily tracker
    session = { lastGrantAt: 0, dailyXp: 0, dayKey };
    xpCooldowns.set(userId, session);
  }

  // Check daily cap
  if (session.dailyXp >= DAILY_XP_CAP) {
    return { granted: false, amount: 0, reason: 'daily_cap' };
  }

  // Check cooldown (60s between any XP grant)
  if (now - session.lastGrantAt < XP_COOLDOWN_MS) {
    return { granted: false, amount: 0, reason: 'cooldown' };
  }

  // Grant — clamp to remaining daily allowance
  const remaining  = DAILY_XP_CAP - session.dailyXp;
  const toGrant    = Math.min(amount, remaining);

  const oldXp      = user.playerXp || 0;
  const oldLevel   = levelFromXp(oldXp);

  user.playerXp    = oldXp + toGrant;

  const newLevel   = levelFromXp(user.playerXp);
  const leveled    = newLevel > oldLevel;

  // Update session
  session.lastGrantAt = now;
  session.dailyXp    += toGrant;

  return { granted: true, amount: toGrant, leveled, oldLevel, newLevel, reason: 'ok' };
}

// ── Cleanup old sessions (call on bot startup, optional) ─────────────────────
function cleanupXpSessions() {
  const today = getDayKey();
  for (const [userId, session] of xpCooldowns.entries()) {
    if (session.dayKey !== today) xpCooldowns.delete(userId);
  }
}

module.exports = {
  PLAYER_LEVEL_CURVE,
  MAX_PLAYER_LEVEL,
  DAILY_XP_CAP,
  XP_COOLDOWN_MS,
  PLAYER_XP,
  totalXpForLevel,
  levelFromXp,
  xpToNextLevel,
  levelProgress,
  playerTitle,
  progressBar,
  awardPlayerXp,
  cleanupXpSessions,
};
