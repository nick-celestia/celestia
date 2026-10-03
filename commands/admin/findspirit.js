const Spirit = require('../../models/Spirit');
const { powerScore } = require('../../utils/stats');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  name: 'findspirit',
  aliases: ['spiritdata', 'spiritadmin'],
  botAdminOnly: true,
  description: 'Bot Admin: find a master spirit record by slug/name.',
  async execute({ message, args, isBotAdmin, isOwner }) {
    const allowed = typeof isBotAdmin === 'function'
      ? isBotAdmin(message.author.id)
      : (typeof isOwner === 'function' && isOwner(message.author.id));

    if (!allowed) return message.reply('Only Celestia bot admins can use this command.');

    const query = args.join(' ').trim();
    if (!query) return message.reply('Use: `c findspirit <slug or name>`');

    const spirit = await Spirit.findOne({
      $or: [
        { slug: query.toLowerCase() },
        { name: new RegExp(`^${escapeRegex(query)}$`, 'i') }
      ]
    });

    if (!spirit) {
      const similar = await Spirit.find({
        name: new RegExp(escapeRegex(query), 'i')
      }).limit(5);

      if (!similar.length) return message.reply('No spirit found.');
      return message.reply(`No exact spirit found. Similar:\n${similar.map((s) => `• ${s.emoji} **${s.name}** — \`${s.slug}\``).join('\n')}`);
    }

    return message.reply([
      `${spirit.emoji} **${spirit.name}**`,
      `ID: \`${spirit._id}\``,
      `Slug: \`${spirit.slug}\``,
      `Tier: **${spirit.tier}**`,
      `Type: **${spirit.types.join(' / ')}**`,
      `Stats: HP ${spirit.baseStats.hp} • ATK ${spirit.baseStats.atk} • DEF ${spirit.baseStats.def} • SPD ${spirit.baseStats.spd}`,
      `Power Score: **${powerScore(spirit.baseStats).toFixed(1)}**`,
      `Source: **${spirit.source}**`,
      `Active: **${spirit.active ? 'Yes' : 'No'}**`,
      `Summonable: **${spirit.summonable ? 'Yes' : 'No'}**`,
      `Animated Emoji: **${spirit.animatedEmoji ? 'Yes' : 'No'}**`,
      `Evolved Form: **${spirit.isEvolvedForm ? 'Yes' : 'No'}**`
    ].join('\n'));
  }
};
