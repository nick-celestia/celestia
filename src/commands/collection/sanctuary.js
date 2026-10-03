const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const UserSpirit = require('../../models/UserSpirit');
const { mentionToId } = require('../../utils/args');
const { fmt } = require('../../utils/format');
const { bondTitle } = require('../../services/bondService');
const { getConstellationProgress, completedConstellationCount } = require('../../services/constellationService');

module.exports = {
  name: 'sanctuary',
  aliases: ['home', 'haven'],
  description: 'Show a player Spirit Sanctuary.',
  async execute({ client, message, args, prefix }) {
    const targetId = mentionToId(args[0]) || message.author.id;
    const user = await User.findOne({ userId: targetId });

    if (!user) {
      return message.reply('That user has not started their Celestia journey yet.');
    }

    const owned = await UserSpirit.find({ ownerId: targetId })
      .populate('spirit')
      .sort({ bondPoints: -1, level: -1 });

    const uniqueIds = new Set(owned.map((entry) => String(entry.spirit?._id)).filter(Boolean));
    const totalBond = owned.reduce((sum, entry) => sum + (entry.bondPoints || 0), 0);
    const highestBond = owned[0] || null;

    const rarityCounts = {};
    const typeCounts = {};
    for (const entry of owned) {
      if (!entry.spirit) continue;
      rarityCounts[entry.spirit.tier] = (rarityCounts[entry.spirit.tier] || 0) + 1;
      for (const type of entry.spirit.types) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    }

    const progress = await getConstellationProgress(targetId);
    const completed = completedConstellationCount(progress);

    const teamIds = [user.team.slot1, user.team.slot2, user.team.slot3].filter(Boolean);
    const teamMembers = owned.filter((entry) => teamIds.includes(entry.shortId));
    const teamText = teamMembers.length
      ? teamMembers.map((entry) => `${entry.spirit.emoji} ${entry.nickname || entry.spirit.name} \`${entry.shortId}\``).join('\n')
      : 'No complete team set.';

      const RARITY_ORDER = ['Common','Uncommon','Rare','Epic','Legendary','Mythic','Celestial','Ascended','Custom'];
      const rarityText = RARITY_ORDER
        .filter(r => rarityCounts[r])
        .map(r => `${r}: ${rarityCounts[r]}`)
        .join(' • ') || 'None';

    const typeText = Object.entries(typeCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(' • ') || 'None';

    const targetUser = await client.users.fetch(targetId).catch(() => null);
    const titleName = targetUser?.username || targetId;

    const embed = new EmbedBuilder()
      .setTitle(`🏛️ ${titleName}'s Spirit Sanctuary`)
      .setDescription('A home for summoned spirits, bonds, teams, and completed constellations.')
      .addFields(
        {
          name: 'Collection',
          value: `Owned copies: **${fmt(owned.length)}**\nUnique spirits: **${fmt(uniqueIds.size)}**`,
          inline: true
        },
        {
          name: 'Battle Record',
          value: `Wins: **${fmt(user.wins)}**\nLosses: **${fmt(user.losses)}**`,
          inline: true
        },
        {
          name: 'Constellations',
          value: `Completed: **${completed}/6**`,
          inline: true
        },
        {
          name: 'Spirit Bond',
          value: highestBond
            ? `Total: **${fmt(totalBond)}**\nHighest: ${highestBond.spirit.emoji} **${highestBond.nickname || highestBond.spirit.name}** — Lv.${highestBond.bondLevel} ${bondTitle(highestBond.bondLevel)}`
            : 'No bonded spirits yet.'
        },
        {
          name: 'Current Team',
          value: teamText.slice(0, 1024)
        },
        {
          name: 'Rarity Distribution',
          value: rarityText.slice(0, 1024)
        },
        {
          name: 'Type Distribution',
          value: typeText.slice(0, 1024)
        }
      )
      .setFooter({ text: `Use ${prefix}constellation, ${prefix}bond, and ${prefix}team.` });

    return message.reply({ embeds: [embed] });
  }
};
