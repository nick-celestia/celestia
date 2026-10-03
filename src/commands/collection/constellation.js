const { EmbedBuilder } = require('discord.js');
const { TYPES } = require('../../config/game');
const { getConstellationProgress } = require('../../services/constellationService');

function normalizeType(input) {
  if (!input) return null;
  return TYPES.find((type) => type.toLowerCase() === String(input).toLowerCase()) || null;
}

module.exports = {
  name: 'constellation',
  aliases: ['constellations', 'map', 'constellationmap'],
  description: 'View your Celestia Constellation Map.',
  async execute({ message, args, prefix }) {
    const progress = await getConstellationProgress(message.author.id);
    const requestedType = normalizeType(args[0]);

    if (args[0] && !requestedType) {
      return message.reply(`Unknown type. Choose: ${TYPES.join(', ')}`);
    }

    if (requestedType) {
      const entry = progress[requestedType];
      const collectedNames = entry.collectedSpirits.length
        ? entry.collectedSpirits.map((spirit) => `${spirit.emoji} ${spirit.name}`).join('\n')
        : 'None yet.';

      const missingNames = entry.missing.length
        ? entry.missing.slice(0, 10).map((spirit) => `• ${spirit.name}`).join('\n')
        : 'Constellation completed!';

      const embed = new EmbedBuilder()
        .setTitle(`${entry.emoji} ${entry.name}`)
        .setDescription(entry.description)
        .addFields(
          {
            name: 'Progress',
            value: `**${entry.collected}/${entry.total}** unique official ${requestedType} spirits`,
            inline: true
          },
          {
            name: 'Status',
            value: entry.complete ? '✨ Completed' : '🌌 In progress',
            inline: true
          },
          {
            name: 'Collected',
            value: collectedNames.slice(0, 1024)
          },
          {
            name: 'Still Missing',
            value: missingNames.slice(0, 1024)
          }
        )
        .setFooter({ text: `Use ${prefix}constellation to view the full map.` });

      return message.reply({ embeds: [embed] });
    }

    const lines = Object.values(progress).map((entry) => {
      const barLength = 10;
      const filled = entry.total > 0
        ? Math.round((entry.collected / entry.total) * barLength)
        : 0;
      const bar = '◆'.repeat(filled) + '◇'.repeat(Math.max(0, barLength - filled));
      return `${entry.emoji} **${entry.name}** — ${entry.collected}/${entry.total}\n${bar}${entry.complete ? ' ✨' : ''}`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🌌 Celestia Constellation Map')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `Use ${prefix}constellation <type> for details.` });

    return message.reply({ embeds: [embed] });
  }
};
