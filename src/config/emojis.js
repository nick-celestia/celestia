// ─────────────────────────────────────────────────────────────────────────────
// src/config/emojis.js — Central Emoji Registry
// ─────────────────────────────────────────────────────────────────────────────
// ALL emoji used anywhere in Celestia live here.
// To change any emoji: edit the value here. It updates everywhere automatically.
//
// HOW TO ADD A CUSTOM DISCORD EMOJI:
//   1. Upload image to your emoji server (Server Settings → Emoji)
//   2. In any Discord channel type \:emojiname: and send
//   3. Copy the result — it looks like <:emojiname:1234567890123456789>
//   4. Paste it as the value below
//
// FORMAT:
//   Static emoji:   '<:name:ID>'     e.g. '<:stardust:1234567890123456789>'
//   Animated emoji: '<a:name:ID>'    e.g. '<a:void_dominion:1234567890123456789>'
//   Unicode fallback: just the emoji  e.g. '✨'
//
// CURRENT STATUS: all using Unicode fallbacks.
// Replace each value with your custom emoji string when ready.
// ─────────────────────────────────────────────────────────────────────────────

const E = {

  // ── Currency & Resources ────────────────────────────────────────────────────
  mana:         '🔮',    // replace: '<:mana:ID>'
  stardust:     '✨',    // replace: '<:stardust:ID>'
  star:         '⭐',    // replace: '<:celestia_star:ID>'
  forgeKey:     '🔑',    // replace: '<:constellation_key:ID>'

  // ── Rarity Tiers ────────────────────────────────────────────────────────────
  // Used in collection, spirit display, leaderboards everywhere
  rarity: {
    Common:    '⬜',    // replace: '<:r_common:ID>'
    Uncommon:  '🟩',    // replace: '<:r_uncommon:ID>'
    Rare:      '🟦',    // replace: '<:r_rare:ID>'
    Epic:      '🟪',    // replace: '<:r_epic:ID>'
    Custom:    '🌐',    // replace: '<:r_custom:ID>'
    Legendary: '🟨',    // replace: '<:r_legendary:ID>'
    Mythic:    '🔶',    // replace: '<:r_mythic:ID>'
    Celestial: '💠',    // replace: '<:r_celestial:ID>'
    Ascended:  '🔱',    // replace: '<:r_ascended:ID>'
  },

  // ── Element Types ────────────────────────────────────────────────────────────
  type: {
    Light:  '✨',    // replace: '<:t_light:ID>'
    Void:   '🌙',    // replace: '<:t_void:ID>'
    Flame:  '🔥',    // replace: '<:t_flame:ID>'
    Nature: '🍃',    // replace: '<:t_nature:ID>'
    Storm:  '⚡',    // replace: '<:t_storm:ID>'
    Tide:   '🌊',    // replace: '<:t_tide:ID>'
  },

  // ── Weapons ─────────────────────────────────────────────────────────────────
  weapon: {
    iron_fang:        '🗡️',   // replace: '<:w_iron_fang:ID>'
    bone_claw:        '🦴',   // replace: '<:w_bone_claw:ID>'
    soul_blade:       '⚔️',   // replace: '<:w_soul_blade:ID>'
    feral_fang:       '🐾',   // replace: '<:w_feral_fang:ID>'
    storm_edge:       '⚡',   // replace: '<:w_storm_edge:ID>'
    shadow_stab:      '🌑',   // replace: '<:w_shadow_stab:ID>'
    void_reaper:      '🌌',   // replace: '<:w_void_reaper:ID>'
    celestial_lance:  '✨',   // replace: '<:w_celestial_lance:ID>'
    shield_rune:      '🛡️',  // replace: '<:w_shield_rune:ID>'
    iron_wall:        '🪨',   // replace: '<:w_iron_wall:ID>'
    thornwall:        '🌵',   // replace: '<:w_thornwall:ID>'
    guardian_aegis:   '🔮',   // replace: '<:w_guardian_aegis:ID>'
    healing_orb:      '💚',   // replace: '<:w_healing_orb:ID>'
    mending_root:     '🌿',   // replace: '<:w_mending_root:ID>'
    celestial_bloom:  '🌸',   // replace: '<:w_celestial_bloom:ID>'
    speed_charm:      '💨',   // replace: '<:w_speed_charm:ID>'
    shadow_step:      '👤',   // replace: '<:w_shadow_step:ID>'
    phantom_step:     '🌀',   // replace: '<:w_phantom_step:ID>'
    bond_crystal:     '💎',   // replace: '<:w_bond_crystal:ID>'
    survivors_will:   '🔥',   // replace: '<:w_survivors_will:ID>'
    type_resonance:   '🌈',   // replace: '<:w_type_resonance:ID>'
    void_dominion:    '🌠',   // replace: '<:w_void_dominion:ID>'
  },

  // ── Weapon Crates ────────────────────────────────────────────────────────────
  crate: {
    common_crate:   '📦',    // replace: '<:crate_common:ID>'
    uncommon_crate: '📫',    // replace: '<:crate_uncommon:ID>'
    rare_crate:     '🎁',    // replace: '<:crate_rare:ID>'
    epic_crate:     '💝',    // replace: '<:crate_epic:ID>'
  },

  // ── Battle & Stats ───────────────────────────────────────────────────────────
  win:        '🏆',
  loss:       '💀',
  tie:        '⚖️',
  streak:     '🔥',
  battleTeam: '⚔️',
  locked:     '🔒',
  unlocked:   '🔓',

  // ── Player Level Titles ──────────────────────────────────────────────────────
  // Shown next to level titles in rank card and leaderboard
  title: {
    'Wanderer':             '🌿',
    'Apprentice':           '📚',
    'Summoner':             '🌀',
    'Spirit Caller':        '🔔',
    'Bond Keeper':          '💞',
    'Spirit Elder':         '🌟',
    'Constellation Sage':   '🌌',
    'Void Walker':          '🌑',
    'Astral Master':        '🔱',
    'Celestial Sovereign':  '👑',
  },

  // ── Shop Items ───────────────────────────────────────────────────────────────
  item: {
    lucky_star:      '🌟',   // replace: '<:item_luckystar:ID>'
    battle_charm:    '💫',   // replace: '<:item_battlecharm:ID>'
    rename_scroll:   '📜',   // replace: '<:item_renamescroll:ID>'
    celestial_stone: '💠',   // replace: '<:item_celestialstone:ID>'
  },

  // ── Bond Titles ──────────────────────────────────────────────────────────────
  bond: {
    'Newly Met':         '🌱',
    'Familiar':          '🤝',
    'Trusted':           '💙',
    'Devoted':           '💜',
    'Soulbound':         '🔗',
    'Eternal Resonance': '🌌',
    'Astral Soulmate':   '💫',
  },

  // ── Constellation Types ───────────────────────────────────────────────────────
  constellation: {
    Light:  '👑',
    Void:   '🌑',
    Flame:  '🌞',
    Nature: '🌿',
    Storm:  '⚡',
    Tide:   '🌊',
  },

  // ── UI Chrome ────────────────────────────────────────────────────────────────
  dot:      '•',
  arrow:    '→',
  check:    '✅',
  cross:    '❌',
  warning:  '⚠️',
  info:     'ℹ️',
  loading:  '⏳',

};

// ── Helper — get weapon emoji by weaponId ─────────────────────────────────────
function weaponEmoji(weaponId) {
  return E.weapon[weaponId] || '⚔️';
}

// ── Helper — get rarity emoji by tier name ────────────────────────────────────
function rarityEmoji(tier) {
  return E.rarity[tier] || '⬜';
}

// ── Helper — get type emoji by type name ──────────────────────────────────────
function typeEmoji(typeName) {
  return E.type[typeName] || '❓';
}

// ── Helper — get title emoji ──────────────────────────────────────────────────
function titleEmoji(titleName) {
  return E.title[titleName] || '🌟';
}

// ── Helper — get bond title emoji ────────────────────────────────────────────
function bondEmoji(bondTitle) {
  return E.bond[bondTitle] || '💙';
}

module.exports = { E, weaponEmoji, rarityEmoji, typeEmoji, titleEmoji, bondEmoji };
