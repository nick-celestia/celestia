const mongoose = require('mongoose');
const { ECONOMY } = require('../config/game');

const userSchema = new mongoose.Schema({
  userId:           { type: String, required: true, unique: true, index: true },
  mana:             { type: Number, default: ECONOMY.startingMana },
  summonCount:      { type: Number, default: 0 },
  battleStreak:     { type: Number, default: 0 },
  bestBattleStreak: { type: Number, default: 0 },
  wins:             { type: Number, default: 0 },
  losses:           { type: Number, default: 0 },
  ties:             { type: Number, default: 0 },

  daily: {
    lastClaimAt: { type: Date,   default: null },
    streak:      { type: Number, default: 0 }
  },

  team: {
    slot1: { type: String, default: null },
    slot2: { type: String, default: null },
    slot3: { type: String, default: null }
  },

  items: {
    lucky_star:      { type: Number, default: 0 },
    battle_charm:    { type: Number, default: 0 },
    rename_scroll:   { type: Number, default: 0 },
    celestial_stone: { type: Number, default: 0 }
  },

  // Stardust economy
  stardust:      { type: Number, default: 0 },  // current spendable balance
  stardustTotal: { type: Number, default: 0 },  // lifetime total (for leaderboard)
  stardustSpent: { type: Number, default: 0 },  // total spent on spirit XP

  // Account level
  playerXp: { type: Number, default: 0 },

  // Active effects
  effects: {
    luckyStarSummons:   { type: Number, default: 0 },
    battleCharmBattles: { type: Number, default: 0 }
  },

  // Premium / STAR
  premium: {
    starsAvailable:    { type: Number, default: 0 },
    starsPending:      { type: Number, default: 0 },
    customAccessUntil: { type: Date,   default: null }
  },

  // Legal
  legal: {
    termsAcceptedAt:       { type: Date,   default: null },
    termsVersion:          { type: String, default: null },
    privacyVersion:        { type: String, default: null },
    acceptedFromGuildId:   { type: String, default: null },
    acceptedFromChannelId: { type: String, default: null },
    lastPolicyPromptAt:    { type: Date,   default: null }
  },

  // Security / anti-abuse
  security: {
    permanentBan:              { type: Boolean, default: false },
    bannedUntil:               { type: Date,    default: null },
    banReason:                 { type: String,  default: null },
    verificationRequired:      { type: Boolean, default: false },
    verificationReason:        { type: String,  default: null },
    verifiedAt:                { type: Date,    default: null },
    captchaFailedAttempts:     { type: Number,  default: 0 },
    captchaTriggerCount:       { type: Number,  default: 0 },
    captchaIgnoredCommands:    { type: Number,  default: 0 },
    captchaBanCount:           { type: Number,  default: 0 },
    lastCaptchaIgnoreBanMs:    { type: Number,  default: 0 },
    lastCaptchaFailedAt:       { type: Date,    default: null },
    lastCaptchaTriggeredAt:    { type: Date,    default: null },
    lastCaptchaIgnoreBannedAt: { type: Date,    default: null }
  },

  // Quick-action button preferences
  // Players can toggle summon and battle repeat buttons on/off
  buttonPrefs: {
    summonButton: { type: Boolean, default: true  },  // show "Summon Again" button
    battleButton: { type: Boolean, default: true  },  // show "Battle Again" button
  },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
