// Merged: bond_progression_balance_patch + constellation_bond_sanctuary_patch
// Both versions are nearly identical. Constellation adds total bond points aggregation
// in the list view. bond_balance has the correct pointsForNextBondLevel import.
// This file uses the quadratic bondService (our FINAL/bondService.js).

const { EmbedBuilder } = require('discord.js');
const UserSpirit       = require('../../models/UserSpirit');
const { findOwnedSpirit } = require('../../services/spiritService');
const { bondTitle, pointsForNextBondLevel, pointsRequiredForLevel } = require('../../services/bondService');
const { fmt } = require('../../utils/format');

module.exports = {
  name: 'bond',
  aliases: ['spiritbond', 'affection'],
  description: 'View your Spirit Bond progress.',

  async execute({ message, args, prefix }) {
    const shortId = args[0];

    // ── Single spirit view ────────────────────────────────────────────────────
    if (shortId) {
      const owned = await findOwnedSpirit(message.author.id, shortId);
      if (!owned) return message.reply('Spirit not found in your collection.');

      const next      = pointsForNextBondLevel(owned.bondLevel);
      const remaining = next === null ? 0 : Math.max(0, next - (owned.bondPoints || 0));
      const thisLevel = pointsRequiredForLevel(owned.bondLevel);
      const intoLevel = Math.max(0, (owned.bondPoints || 0) - thisLevel);
      const levelSpan = next !== null ? next - thisLevel : null;

      const progressBar = (() => {
        if (next === null) return '█████████████████████ MAX';
        const pct   = levelSpan > 0 ? Math.min(1, intoLevel / levelSpan) : 0;
        const filled = Math.round(pct * 20);
        return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${Math.round(pct * 100)}%`;
      })();

      const progressText = next === null
        ? 'Maximum bond reached! 🌟'
        : `${fmt(owned.bondPoints || 0)} / ${fmt(next)} pts • ${fmt(remaining)} to next level`;

      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle(`💞 ${owned.nickname || owned.spirit.name}`)
        .setDescription(`${owned.spirit.emoji} Spirit ID: \`${owned.shortId}\``)
        .addFields(
          { name: 'Bond Level',       value: `**${owned.bondLevel}** / 100`,            inline: true },
          { name: 'Bond Title',       value: `**${bondTitle(owned.bondLevel)}**`,        inline: true },
          { name: 'Bond Points',      value: `**${fmt(owned.bondPoints || 0)}**`,        inline: true },
          { name: 'Battles Together', value: `**${fmt(owned.battlesTogether || 0)}**`,   inline: true },
          { name: 'Progress',         value: progressText,                               inline: false },
          { name: 'Progress Bar',     value: `\`${progressBar}\``,                      inline: false }
        )
        .setFooter({ text: `Win battles to earn +5 bond pts • Losses earn +1 • Use ${prefix}bond for top bonds` });

      return message.reply({ embeds: [embed] });
    }

    // ── Top 5 bonds list view ─────────────────────────────────────────────────
    const spirits = await UserSpirit.find({ ownerId: message.author.id })
      .sort({ bondPoints: -1, createdAt: 1 })
      .limit(5)
      .populate('spirit');

    if (!spirits.length) {
      return message.reply(`You do not own any spirits yet. Use \`${prefix}s\` to summon.`);
    }

    const totalAgg = await UserSpirit.aggregate([
      { $match: { ownerId: message.author.id } },
      { $group: { _id: null, total: { $sum: '$bondPoints' } } }
    ]);
    const totalPoints = totalAgg[0]?.total || 0;

    const lines = spirits.map((owned, idx) =>
      `**${idx + 1}.** ${owned.spirit.emoji} ${owned.nickname || owned.spirit.name} \`${owned.shortId}\` — ` +
      `Bond Lv.**${owned.bondLevel}** • ${bondTitle(owned.bondLevel)} • ${fmt(owned.bondPoints || 0)} pts`
    );

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('💞 Your Strongest Spirit Bonds')
      .setDescription(lines.join('\n'))
      .addFields(
        { name: 'Total Bond Points', value: `**${fmt(totalPoints)}**`, inline: true }
      )
      .setFooter({ text: `${prefix}bond <spiritId> for details • ${prefix}bondlb for leaderboard` });

    return message.reply({ embeds: [embed] });
  }
};
