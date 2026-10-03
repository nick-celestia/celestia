const { getOrCreateUser } = require('../../services/userService');
const UserSpirit = require('../../models/UserSpirit');
const TeamSnapshot = require('../../models/TeamSnapshot'); // ← NEW
const { spiritDisplay } = require('../../services/spiritService');
const { TYPE_ADVANTAGE, TYPES, BATTLE_RULES } = require('../../config/game');
const { battleStats, battlePowerScore, spiritRole } = require('../../utils/stats');

// ---------------------------------------------------------------------------
// Saves (or clears) the player's TeamSnapshot whenever their team changes.
// Only saves when ALL 3 slots are filled; deletes the snapshot otherwise.
// ---------------------------------------------------------------------------
async function syncTeamSnapshot(userId, team) {
  const ids = [team.slot1, team.slot2, team.slot3];
  const allFilled = ids.every(Boolean);

  if (!allFilled) {
    // Team is incomplete — remove any existing snapshot so this player isn't
    // selected as a random opponent until they have a full team again.
    await TeamSnapshot.findOneAndDelete({ userId });
    return;
  }

  // Load spirit data for denormalisation
  const owned = await UserSpirit.find({ ownerId: userId, shortId: { $in: ids } }).populate('spirit');
  const byId = new Map(owned.map((us) => [us.shortId, us]));

  const spirits = ids.map((id) => {
    const us = byId.get(id);
    if (!us) return null;
    return {
      shortId: us.shortId,
      level: us.level,
      spirit: {
        name: us.spirit.name,
        emoji: us.spirit.emoji,
        types: us.spirit.types,
        baseStats: us.spirit.baseStats
      }
    };
  });

  if (spirits.some((s) => !s)) {
    // One of the spirits couldn't be found — don't save a broken snapshot
    await TeamSnapshot.findOneAndDelete({ userId });
    return;
  }

  await TeamSnapshot.findOneAndUpdate(
    { userId },
    { userId, slot1: ids[0], slot2: ids[1], slot3: ids[2], spirits },
    { upsert: true, new: true }
  );
}

module.exports = {
  name: 'team',
  aliases: [],
  description: 'View, edit, or analyze your 3-spirit battle team.',
  async execute({ message, args }) {
    const user = await getOrCreateUser(message.author.id);
    const sub = args[0]?.toLowerCase();

    if (sub === 'add') {
      const pos = Number(args[1]);
      const id = args[2]?.toUpperCase();
      if (![1, 2, 3].includes(pos) || !id) return message.reply('Use: `c team add <1-3> <spiritId>`');
      const owned = await UserSpirit.findOne({ ownerId: message.author.id, shortId: id });
      if (!owned) return message.reply('You do not own that spirit.');
      user.team[`slot${pos}`] = id;
      await user.save();
      await syncTeamSnapshot(message.author.id, user.team); // ← AUTO-SAVE
      return message.reply(`✅ Added \`${id}\` to team slot ${pos}.`);
    }

    if (sub === 'remove') {
      const pos = Number(args[1]);
      if (![1, 2, 3].includes(pos)) return message.reply('Use: `c team remove <1-3>`');
      user.team[`slot${pos}`] = null;
      await user.save();
      await syncTeamSnapshot(message.author.id, user.team); // ← AUTO-SAVE (will delete snapshot if incomplete)
      return message.reply(`✅ Removed team slot ${pos}.`);
    }

    const slots = [user.team.slot1, user.team.slot2, user.team.slot3];
    const owned = await UserSpirit.find({ ownerId: message.author.id, shortId: { $in: slots.filter(Boolean) } }).populate('spirit');
    const byId = new Map(owned.map((us) => [us.shortId, us]));

    if (sub === 'analyze') {
      const team = slots.map((id) => id ? byId.get(id) : null);
      if (team.some((slot) => !slot)) return message.reply('Your team must have all 3 slots filled before analysis.');

      const teamTypes = new Set();
      const coveredTypes = new Set();
      const weakTo = new Set();
      const lines = team.map((us, idx) => {
        for (const type of us.spirit.types) {
          teamTypes.add(type);
          for (const beaten of TYPE_ADVANTAGE[type] || []) coveredTypes.add(beaten);
        }
        for (const enemyType of TYPES) {
          const beats = TYPE_ADVANTAGE[enemyType] || [];
          if (us.spirit.types.some((type) => beats.includes(type))) weakTo.add(enemyType);
        }
        const stats = battleStats(us.spirit.baseStats, us.level);
        const role = spiritRole(stats);
        const power = battlePowerScore(stats, { weights: BATTLE_RULES.weights });
        return `Slot ${idx + 1}: ${us.spirit.emoji} **${us.spirit.name}** \`${us.shortId}\` | ${us.spirit.types.join('/')} | Lv.${us.level} | ${role} | Battle score ${power.toFixed(1)}`;
      });

      const tips = [];
      if (coveredTypes.size < 4) tips.push('Try adding more type coverage so your team can pressure more enemy types.');
      if (teamTypes.size < 3) tips.push('Your team repeats types heavily; this can make one counter-type dangerous.');
      if (!team.some((us) => spiritRole(battleStats(us.spirit.baseStats, us.level)) === 'Guardian')) tips.push('Consider one Guardian-style spirit for stability.');
      if (!team.some((us) => spiritRole(battleStats(us.spirit.baseStats, us.level)) === 'Striker')) tips.push('Consider one Striker-style spirit for damage.');
      if (!tips.length) tips.push('Good balance: your team has decent role/type spread.');

      return message.reply(`📊 **Team Analysis**\n${lines.join('\n')}\n\nTypes you can pressure: **${[...coveredTypes].join(', ') || 'None'}**\nTypes that pressure you: **${[...weakTo].join(', ') || 'None'}**\n\n**Tips**\n- ${tips.join('\n- ')}\n\nUse \`c mechanics\` for the battle formula.`);
    }

    const lines = slots.map((id, idx) => {
      if (!id) return `Slot ${idx + 1}: empty`;
      const us = byId.get(id);
      return `Slot ${idx + 1}: ${us ? spiritDisplay(us) : `missing spirit ${id}`}`;
    });
    await message.reply(`⚔️ **Your Team**\n${lines.join('\n')}\n\nUse \`c team add <1-3> <spiritId>\`. Use \`c team analyze\` for team-building details.`);
  }
};
