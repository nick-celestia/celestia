// ─────────────────────────────────────────────────────────────────────────────
// Celestia Weapons Config
// ─────────────────────────────────────────────────────────────────────────────
// Each weapon entry defines:
//   id         - slug used in code and commands
//   name       - display name
//   emoji      - Discord emoji (custom or unicode — see EMOJI GUIDE below)
//   rarity     - Common / Uncommon / Rare / Epic / Legendary / Mythic
//   wpCost     - WP to activate (0 = passive, always applies)
//   type       - 'passive' | 'active' | 'support' | 'conditional'
//   stat       - which stat it primarily scales from
//   minStat    - minimum roll (decimal: 0.08 = 8%)
//   maxStat    - maximum roll (decimal: 0.20 = 20%)
//   description- shown to players
//   crushValue - Forge Shards gained when crushed
//
// EMOJI GUIDE:
//   Using custom Discord emojis: '<:weaponname:EMOJI_ID_HERE>'
//   Using unicode emojis (free, no upload needed): just paste the emoji
//   Recommended: upload weapon art to a private emoji server, copy the ID,
//   replace the placeholder strings below with '<:name:id>' format.
//   Until custom emojis are ready, unicode placeholders work perfectly.
// ─────────────────────────────────────────────────────────────────────────────

const WEAPON_CRUSH_VALUES = {
  Common:    1,
  Uncommon:  3,
  Rare:      8,
  Epic:      20,
  Legendary: 50,
  Mythic:    150,
};

const WEAPON_CRATE_RATES = {
  // Rarity weights for each crate tier
  common_crate:    { Common: 70, Uncommon: 25, Rare: 5,  Epic: 0,  Legendary: 0,  Mythic: 0 },
  uncommon_crate:  { Common: 40, Uncommon: 40, Rare: 15, Epic: 5,  Legendary: 0,  Mythic: 0 },
  rare_crate:      { Common: 20, Uncommon: 30, Rare: 35, Epic: 13, Legendary: 2,  Mythic: 0 },
  epic_crate:      { Common: 5,  Uncommon: 15, Rare: 40, Epic: 32, Legendary: 7,  Mythic: 1 },
};

// Vote crate schedule — every Nth vote grants a crate
const VOTE_CRATE_INTERVAL = 2;   // every 2nd vote = one crate
// Crate type from vote follows these weights:
const VOTE_CRATE_RATES    = { common_crate: 60, uncommon_crate: 30, rare_crate: 9, epic_crate: 1 };

const WEAPONS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICAL — scale off ATK
  // ═══════════════════════════════════════════════════════════════════════════

  iron_fang: {
    id: 'iron_fang', name: 'Iron Fang',
    // Replace with: '<:iron_fang:YOUR_EMOJI_ID>' once uploaded
    emoji: '🗡️',
    rarity: 'Common', wpCost: 0, type: 'passive', stat: 'atk',
    minStat: 0.08, maxStat: 0.15,
    description: 'Passive: +8–15% ATK in every battle.',
    crushValue: WEAPON_CRUSH_VALUES.Common,
    apply(power, _stats, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat), log: `+${(rolledStat*100).toFixed(1)}% ATK (Iron Fang)` };
    }
  },

  bone_claw: {
    id: 'bone_claw', name: 'Bone Claw',
    emoji: '🦴',
    rarity: 'Common', wpCost: 0, type: 'passive', stat: 'atk',
    minStat: 0.12, maxStat: 0.22,
    description: 'Passive: +12–22% ATK, but −6% DEF.',
    crushValue: WEAPON_CRUSH_VALUES.Common,
    apply(power, _s, _us, _ctx, rolledStat) {
      // Net: +rolledStat ATK offset by small DEF reduction ≈ rolledStat × 0.85
      return { power: power * (1 + rolledStat * 0.85), log: `+${(rolledStat*100).toFixed(1)}% ATK −6% DEF (Bone Claw)` };
    }
  },

  soul_blade: {
    id: 'soul_blade', name: 'Soul Blade',
    emoji: '⚔️',
    rarity: 'Uncommon', wpCost: 15, type: 'active', stat: 'atk',
    minStat: 1.10, maxStat: 1.60,
    description: 'Active (15WP): Deals 110–160% of ATK to a random opponent.',
    crushValue: WEAPON_CRUSH_VALUES.Uncommon,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.atk * rolledStat;
      return { power, bonus, target: 'random', log: `Soul Blade → ${bonus.toFixed(1)} bonus (${(rolledStat*100).toFixed(0)}%)` };
    }
  },

  feral_fang: {
    id: 'feral_fang', name: 'Feral Fang',
    emoji: '🐾',
    rarity: 'Uncommon', wpCost: 12, type: 'active', stat: 'atk',
    minStat: 0.80, maxStat: 1.20,
    description: 'Active (12WP): Hits 2 random opponents for 80–120% ATK each.',
    crushValue: WEAPON_CRUSH_VALUES.Uncommon,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.atk * rolledStat;
      return { power, bonus, target: 'random_two', log: `Feral Fang → ${bonus.toFixed(1)} × 2 targets` };
    }
  },

  storm_edge: {
    id: 'storm_edge', name: 'Storm Edge',
    emoji: '⚡',
    rarity: 'Rare', wpCost: 20, type: 'active', stat: 'atk',
    minStat: 0.90, maxStat: 1.30,
    description: 'Active (20WP): Deals 90–130% ATK to ALL 3 opponents.',
    crushValue: WEAPON_CRUSH_VALUES.Rare,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.atk * rolledStat;
      return { power, bonus, target: 'all', log: `Storm Edge → ${bonus.toFixed(1)} to all (${(rolledStat*100).toFixed(0)}%)` };
    }
  },

  shadow_stab: {
    id: 'shadow_stab', name: 'Shadow Stab',
    emoji: '🌑',
    rarity: 'Rare', wpCost: 18, type: 'active', stat: 'atk',
    minStat: 0.60, maxStat: 0.90,
    description: 'Active (18WP): Strikes same target TWICE for 60–90% ATK each hit.',
    crushValue: WEAPON_CRUSH_VALUES.Rare,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.atk * rolledStat * 2;
      return { power, bonus, target: 'random', log: `Shadow Stab → ${bonus.toFixed(1)} (×2 hits, ${(rolledStat*100).toFixed(0)}% each)` };
    }
  },

  void_reaper: {
    id: 'void_reaper', name: 'Void Reaper',
    emoji: '🌌',
    rarity: 'Epic', wpCost: 25, type: 'active', stat: 'atk',
    minStat: 1.60, maxStat: 2.20,
    description: 'Active (25WP): Deals 160–220% ATK to the opponent\'s strongest spirit.',
    crushValue: WEAPON_CRUSH_VALUES.Epic,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.atk * rolledStat;
      return { power, bonus, target: 'strongest', log: `Void Reaper → ${bonus.toFixed(1)} to strongest (${(rolledStat*100).toFixed(0)}%)` };
    }
  },

  celestial_lance: {
    id: 'celestial_lance', name: 'Celestial Lance',
    emoji: '✨',
    rarity: 'Legendary', wpCost: 0, type: 'passive', stat: 'atk',
    minStat: 0.18, maxStat: 0.28,
    description: 'Passive: +18–28% ATK in every battle.',
    crushValue: WEAPON_CRUSH_VALUES.Legendary,
    apply(power, _s, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat), log: `+${(rolledStat*100).toFixed(1)}% ATK (Celestial Lance)` };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSIVE — scale off DEF/HP
  // ═══════════════════════════════════════════════════════════════════════════

  shield_rune: {
    id: 'shield_rune', name: 'Shield Rune',
    emoji: '🛡️',
    rarity: 'Common', wpCost: 0, type: 'passive', stat: 'def',
    minStat: 0.08, maxStat: 0.14,
    description: 'Passive: +8–14% DEF in every battle.',
    crushValue: WEAPON_CRUSH_VALUES.Common,
    apply(power, _s, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat), log: `+${(rolledStat*100).toFixed(1)}% DEF (Shield Rune)` };
    }
  },

  iron_wall: {
    id: 'iron_wall', name: 'Iron Wall',
    emoji: '🪨',
    rarity: 'Uncommon', wpCost: 0, type: 'passive', stat: 'hp',
    minStat: 0.10, maxStat: 0.18,
    description: 'Passive: +10–18% HP and +5–9% DEF.',
    crushValue: WEAPON_CRUSH_VALUES.Uncommon,
    apply(power, _s, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat * 0.90), log: `+${(rolledStat*100).toFixed(1)}% HP/DEF (Iron Wall)` };
    }
  },

  thornwall: {
    id: 'thornwall', name: 'Thornwall',
    emoji: '🌵',
    rarity: 'Rare', wpCost: 22, type: 'active', stat: 'def',
    minStat: 0.20, maxStat: 0.35,
    description: 'Active (22WP): Block 20–35% of incoming damage and reflect half of it back.',
    crushValue: WEAPON_CRUSH_VALUES.Rare,
    apply(power, _s, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat), log: `Thornwall → +${(rolledStat*100).toFixed(1)}% block + reflect` };
    }
  },

  guardian_aegis: {
    id: 'guardian_aegis', name: 'Guardian Aegis',
    emoji: '🔮',
    rarity: 'Epic', wpCost: 20, type: 'active', stat: 'def',
    minStat: 0.28, maxStat: 0.42,
    description: 'Active (20WP): Reduce all damage taken this round by 28–42%.',
    crushValue: WEAPON_CRUSH_VALUES.Epic,
    apply(power, _s, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat), log: `Guardian Aegis → +${(rolledStat*100).toFixed(1)}% defense this round` };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALING — scale off HP
  // ═══════════════════════════════════════════════════════════════════════════

  healing_orb: {
    id: 'healing_orb', name: 'Healing Orb',
    emoji: '💚',
    rarity: 'Common', wpCost: 15, type: 'support', stat: 'hp',
    minStat: 0.70, maxStat: 1.10,
    description: 'Active (15WP): Restores 70–110% of HP as bonus power to weakest ally.',
    crushValue: WEAPON_CRUSH_VALUES.Common,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.hp * rolledStat;
      return { power, bonus, target: 'weakest_ally', log: `Healing Orb → ${bonus.toFixed(1)} to weakest ally` };
    }
  },

  mending_root: {
    id: 'mending_root', name: 'Mending Root',
    emoji: '🌿',
    rarity: 'Uncommon', wpCost: 18, type: 'support', stat: 'hp',
    minStat: 0.30, maxStat: 0.50,
    description: 'Active (18WP): Heals 30–50% HP to a random ally and restores 20% WP.',
    crushValue: WEAPON_CRUSH_VALUES.Uncommon,
    apply(power, stats, us, _ctx, rolledStat) {
      const bonus = stats.hp * rolledStat;
      if (us) us._wp = Math.min((us._wp || 0) + 20, stats.spd);
      return { power, bonus, target: 'random_ally', log: `Mending Root → ${bonus.toFixed(1)} heal + WP restore` };
    }
  },

  celestial_bloom: {
    id: 'celestial_bloom', name: 'Celestial Bloom',
    emoji: '🌸',
    rarity: 'Epic', wpCost: 30, type: 'support', stat: 'hp',
    minStat: 0.55, maxStat: 0.80,
    description: 'Active (30WP): Heals ALL ally spirits for 55–80% HP stat as bonus power.',
    crushValue: WEAPON_CRUSH_VALUES.Epic,
    apply(power, stats, _us, _ctx, rolledStat) {
      const bonus = stats.hp * rolledStat;
      return { power, bonus, target: 'all_allies', log: `Celestial Bloom → ${bonus.toFixed(1)} to all allies` };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEED / UTILITY — scale off SPD
  // ═══════════════════════════════════════════════════════════════════════════

  speed_charm: {
    id: 'speed_charm', name: 'Speed Charm',
    emoji: '💨',
    rarity: 'Uncommon', wpCost: 0, type: 'passive', stat: 'spd',
    minStat: 0.12, maxStat: 0.20,
    description: 'Passive: +12–20% SPD, giving this spirit more WP to use weapons.',
    crushValue: WEAPON_CRUSH_VALUES.Uncommon,
    apply(power, _s, us, _ctx, rolledStat) {
      if (us) us._wp = Math.round((us._wp || 0) * (1 + rolledStat));
      return { power: power * (1 + rolledStat * 0.8), log: `+${(rolledStat*100).toFixed(1)}% SPD/WP (Speed Charm)` };
    }
  },

  shadow_step: {
    id: 'shadow_step', name: 'Shadow Step',
    emoji: '👤',
    rarity: 'Rare', wpCost: 18, type: 'active', stat: 'spd',
    minStat: 0.65, maxStat: 0.85,
    description: 'Active (18WP): 65–85% chance to dodge the next incoming hit this round.',
    crushValue: WEAPON_CRUSH_VALUES.Rare,
    apply(power, _s, _us, _ctx, rolledStat) {
      const dodged = Math.random() < rolledStat;
      return {
        power: dodged ? power * 1.30 : power,
        log: dodged
          ? `Shadow Step → dodged! +30% power (${(rolledStat*100).toFixed(0)}% chance)`
          : `Shadow Step → miss (${(rolledStat*100).toFixed(0)}% dodge failed)`
      };
    }
  },

  phantom_step: {
    id: 'phantom_step', name: 'Phantom Step',
    emoji: '🌀',
    rarity: 'Legendary', wpCost: 22, type: 'active', stat: 'spd',
    minStat: 0.45, maxStat: 0.65,
    description: 'Active (22WP): 45–65% dodge chance. On dodge, counter with 50% ATK.',
    crushValue: WEAPON_CRUSH_VALUES.Legendary,
    apply(power, stats, _us, _ctx, rolledStat) {
      const dodged = Math.random() < rolledStat;
      const counter = dodged ? stats.atk * 0.50 : 0;
      return {
        power,
        bonus: counter,
        target: dodged ? 'random' : null,
        log: dodged
          ? `Phantom Step → dodged + counter ${counter.toFixed(1)} dmg`
          : `Phantom Step → dodge failed`
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONAL / BOND — unique conditions
  // ═══════════════════════════════════════════════════════════════════════════

  bond_crystal: {
    id: 'bond_crystal', name: 'Bond Crystal',
    emoji: '💎',
    rarity: 'Rare', wpCost: 0, type: 'passive', stat: 'bond',
    minStat: 0.15, maxStat: 0.25,
    description: 'Passive: +1% power per 100 bond points. Cap scales 15–25% by roll quality.',
    crushValue: WEAPON_CRUSH_VALUES.Rare,
    apply(power, _s, us, _ctx, rolledStat) {
      const bp  = us?.bondPoints || 0;
      const pct = Math.min(rolledStat, Math.floor(bp / 100) * 0.01);
      return { power: power * (1 + pct), log: `Bond Crystal +${(pct*100).toFixed(1)}% (${bp} bond pts, cap ${(rolledStat*100).toFixed(0)}%)` };
    }
  },

  survivors_will: {
    id: 'survivors_will', name: 'Survivor\'s Will',
    emoji: '🔥',
    rarity: 'Legendary', wpCost: 0, type: 'conditional', stat: 'atk',
    minStat: 0.25, maxStat: 0.42,
    description: 'Passive: If your team is losing, gain 25–42% power boost.',
    crushValue: WEAPON_CRUSH_VALUES.Legendary,
    apply(power, _s, _us, ctx, rolledStat) {
      const losing = (ctx?.teamScoreA || 0) < (ctx?.teamScoreB || 0);
      return {
        power: losing ? power * (1 + rolledStat) : power,
        log: losing
          ? `Survivor's Will → +${(rolledStat*100).toFixed(1)}% (losing team!)`
          : `Survivor's Will → not triggered`
      };
    }
  },

  type_resonance: {
    id: 'type_resonance', name: 'Type Resonance',
    emoji: '🌈',
    rarity: 'Epic', wpCost: 0, type: 'conditional', stat: 'atk',
    minStat: 0.10, maxStat: 0.18,
    description: 'Passive: If this spirit has type advantage, gain extra 10–18% on top of type bonus.',
    crushValue: WEAPON_CRUSH_VALUES.Epic,
    apply(power, _s, _us, ctx, rolledStat) {
      const hasAdvantage = ctx?.matchup?.advantaged;
      return {
        power: hasAdvantage ? power * (1 + rolledStat) : power,
        log: hasAdvantage
          ? `Type Resonance → +${(rolledStat*100).toFixed(1)}% type bonus amplified`
          : `Type Resonance → no advantage`
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MYTHIC — Admin-given only
  // ═══════════════════════════════════════════════════════════════════════════

  void_dominion: {
    id: 'void_dominion', name: 'Void Dominion',
    emoji: '🌠',
    rarity: 'Mythic', wpCost: 0, type: 'passive', stat: 'atk',
    minStat: 0.15, maxStat: 0.15,  // fixed stat — Mythic doesn't roll
    description: 'Passive: +15% all stats and ignores type disadvantage.',
    crushValue: WEAPON_CRUSH_VALUES.Mythic,
    apply(power, _s, _us, _ctx, rolledStat) {
      return { power: power * (1 + rolledStat), ignoreDisadvantage: true, log: `+${(rolledStat*100).toFixed(0)}% all + ignore type (Void Dominion)` };
    }
  },

};

// ── Roll a weapon copy ────────────────────────────────────────────────────────
// Returns { weaponId, rolledStat, rarity, crushValue }
function rollWeapon(weaponId) {
  const base = WEAPONS[weaponId];
  if (!base) return null;
  const range   = base.maxStat - base.minStat;
  const raw     = base.minStat + Math.random() * range;
  const rolled  = Math.round(raw * 1000) / 1000;  // 3 decimal places
  return {
    weaponId,
    rolledStat: rolled,
    rarity:     base.rarity,
    crushValue: base.crushValue,
  };
}

// ── Roll a random weapon of a given rarity ────────────────────────────────────
function rollRandomWeapon(rarity) {
  const pool = Object.values(WEAPONS).filter(w => w.rarity === rarity && w.rarity !== 'Mythic');
  if (!pool.length) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return rollWeapon(chosen.id);
}

// ── Pick rarity from weighted table ──────────────────────────────────────────
function pickRarity(rates) {
  const total  = Object.values(rates).reduce((a, b) => a + b, 0);
  let   roll   = Math.random() * total;
  for (const [rarity, weight] of Object.entries(rates)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'Common';
}

// ── Open a crate and return a rolled weapon ───────────────────────────────────
function openCrate(crateType) {
  const rates  = WEAPON_CRATE_RATES[crateType];
  if (!rates) return null;
  const rarity = pickRarity(rates);
  return rollRandomWeapon(rarity);
}

// ── Apply weapon in battle ────────────────────────────────────────────────────
function applyWeapon(weaponId, rolledStat, power, stats, userSpirit, context) {
  if (!weaponId || !rolledStat) return { power, log: null };
  const weapon = WEAPONS[weaponId];
  if (!weapon) return { power, log: null };

  // WP check for active weapons
  if (weapon.wpCost > 0) {
    const currentWp = userSpirit?._wp || 0;
    if (currentWp < weapon.wpCost) return { power, log: `${weapon.name} → no WP` };
    if (userSpirit) userSpirit._wp -= weapon.wpCost;
  }

  return weapon.apply(power, stats, userSpirit, context, rolledStat);
}

module.exports = {
  WEAPONS,
  WEAPON_CRUSH_VALUES,
  WEAPON_CRATE_RATES,
  VOTE_CRATE_INTERVAL,
  VOTE_CRATE_RATES,
  rollWeapon,
  rollRandomWeapon,
  pickRarity,
  openCrate,
  applyWeapon,
};
