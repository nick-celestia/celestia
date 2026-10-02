const TYPES = ['Light', 'Void', 'Flame', 'Nature', 'Storm', 'Tide'];

const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'Celestial',
  'Ascended',
  'Custom'
];

const RARITY_LIMITS = {
  Common: { maxHp: 80, maxAtk: 12, maxDef: 12, maxSpd: 12, maxPower: 45, sell: 3 },
  Uncommon: { maxHp: 100, maxAtk: 16, maxDef: 16, maxSpd: 16, maxPower: 60, sell: 8 },
  Rare: { maxHp: 125, maxAtk: 22, maxDef: 22, maxSpd: 22, maxPower: 80, sell: 25 },
  Epic: { maxHp: 150, maxAtk: 30, maxDef: 30, maxSpd: 30, maxPower: 105, sell: 75 },
  Custom: { maxHp: 170, maxAtk: 34, maxDef: 34, maxSpd: 34, maxPower: 120, sell: 150 },
  Legendary: { maxHp: 190, maxAtk: 40, maxDef: 40, maxSpd: 40, maxPower: 145, sell: 350 },
  Mythic: { maxHp: 230, maxAtk: 50, maxDef: 50, maxSpd: 50, maxPower: 180, sell: 1000 },
  Celestial: { maxHp: 270, maxAtk: 60, maxDef: 60, maxSpd: 60, maxPower: 220, sell: 3000 },
  Ascended: { maxHp: 320, maxAtk: 72, maxDef: 72, maxSpd: 72, maxPower: 270, sell: 9999 }
};

const SUMMON_RATES = {
  normal: {
    Common: 61.8,
    Uncommon: 25.085,
    Rare: 10,
    Epic: 3,
    Legendary: 0.1,
    Mythic: 0.01,
    Celestial: 0.005
  },
  customAccess: {
    Common: 61,
    Uncommon: 25.085,
    Rare: 10,
    Epic: 3,
    Custom: 0.8,
    Legendary: 0.1,
    Mythic: 0.01,
    Celestial: 0.005
  },
  luckyStar: {
    Common: 60,
    Uncommon: 21.862,
    Rare: 12,
    Epic: 5,
    Legendary: 0.3,
    Mythic: 0.03,
    Celestial: 0.008
  }
};

const TYPE_ADVANTAGE = {
  Light: ['Void'],
  Void: ['Storm'],
  Storm: ['Light'],
  Flame: ['Nature'],
  Nature: ['Tide'],
  Tide: ['Flame']
};

const TYPE_EFFECTS = {
  Light: { Void: { name: 'Purify', description: 'Light purifies Void spirits for extra pressure.' } },
  Void: { Storm: { name: 'Silence', description: 'Void silences Storm spirits for extra pressure.' } },
  Storm: { Light: { name: 'Shock', description: 'Storm shocks Light spirits for extra pressure.' } },
  Flame: { Nature: { name: 'Burn', description: 'Flame burns Nature spirits for extra pressure.' } },
  Nature: { Tide: { name: 'Bind', description: 'Nature binds Tide spirits for extra pressure.' } },
  Tide: { Flame: { name: 'Douse', description: 'Tide douses Flame spirits for extra pressure.' } }
};

const BATTLE_RULES = {
  typeAdvantageMultiplier: 1.25,
  typeEffectMultiplier: 1.10,
  randomVariationMin: 0.75,
  randomVariationMax: 1.25,
  weights: {
    hp: 0.4,
    atk: 1.6,
    def: 1.6,
    spd: 1.4
  },
  roleTips: {
    Striker: 'High ATK. Best for bursting weaker slots.',
    Guardian: 'High HP/DEF. Best for absorbing pressure.',
    Swift: 'High SPD. Best for fast, risky matchups.',
    Balanced: 'Stable stats. Best for flexible team slots.'
  }
};

const SHOP_ITEMS = {
  lucky_star: {
    name: 'Lucky Star',
    price: 500,
    description: 'Boosts summon luck for your next 20 summons.'
  },
  battle_charm: {
    name: 'Battle Charm',
    price: 700,
    description: 'Your next 10 battles give 2x spirit XP.'
  },
  rename_scroll: {
    name: 'Rename Scroll',
    price: 300,
    description: 'Allows renaming one owned spirit.'
  }
};

const ECONOMY = {
  startingMana: 100,
  summonCost: 2,
  summonCooldownSeconds: 8,
  dailyMana: 100,
  minGameBet: 100,
  maxGameBet: 5000,
  gameCooldownSeconds: 5,
  battleCooldownSeconds: 10,
  battleWinXp: 20,
  battleLoseXp: 5,
  battleStreakMilestone: 100,
  battleStreakManaMultiplier: 10,
  luckyStarSummons: 20,
  battleCharmBattles: 10
};

const PREMIUM = {
  starDisplayName: 'STAR',
  customAccessDisplayName: 'Constellation Key',
  customAccessDays: 30
};

const SECURITY = {
  rollingWindowMs: 10_000,
  maxCommandsPerWindow: 25,
  maxGameCommandsPerWindow: 15,
  maxSummonAttemptsPerWindow: 12,
  verificationSessionMinutes: 30,

  // Captcha should not punish grinders just for triggering it.
  // A ban happens only when a locked user ignores captcha and keeps sending commands.
  captchaIgnoreCommandBanAfter: 5,
  firstCaptchaIgnoreBanMinutes: 30,
  captchaBanMultiplier: 2,
  captchaBanExtraHours: 6,
  maxCaptchaBanDays: 7,
  captchaCleanResetDays: 14,

  // Failed captcha attempts are logged but do not auto-ban by default.
  captchaFailedAttemptsLogOnly: true
};

module.exports = {
  TYPES,
  RARITIES,
  RARITY_LIMITS,
  SUMMON_RATES,
  TYPE_ADVANTAGE,
  TYPE_EFFECTS,
  BATTLE_RULES,
  SHOP_ITEMS,
  ECONOMY,
  PREMIUM,
  SECURITY
};
