const { EmbedBuilder }    = require('discord.js');
const { approveSubmission } = require('../../services/starService');

// c approvestar <submissionId>

module.exports = {
  name: 'approvestar',
  aliases: ['staraccept', 'acceptstar'],
  botAdminOnly: true,
  description: 'Approve a STAR custom spirit submission.',

  async execute({ client, message, args }) {
    const id = args[0];
    if (!id) return message.reply('Usage: `c approvestar <submissionId>`\nGet IDs from `c reviewstar`.');

    const result = await approveSubmission(id, message.author.id);
    if (!result.ok) return message.reply(`❌ ${result.reason}`);

    const { submission, spirit } = result;

    // DM the creator
    try {
      const creator = await client.users.fetch(submission.submitterId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Your Custom Spirit was Approved!')
        .setDescription(
          `${spirit.emoji} **${spirit.name}** has been added to Celestia!\n\n` +
          `Your spirit is now in the **Custom** summon pool (available to Constellation Key holders).\n` +
          `You have received a locked creator copy in your collection.`
        )
        .addFields(
          { name: 'Types', value: spirit.types.join(' / '), inline: true },
          { name: 'Stats', value: `HP **${spirit.baseStats.hp}** · ATK **${spirit.baseStats.atk}** · DEF **${spirit.baseStats.def}** · SPD **${spirit.baseStats.spd}**`, inline: false },
        )
        .setFooter({ text: 'Thank you for contributing to Celestia! ⭐' })
        .setTimestamp();
      await creator.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Submission Approved')
      .setDescription(`${spirit.emoji} **${spirit.name}** has been added to the game.`)
      .addFields(
        { name: 'Spirit Slug', value: `\`${spirit.slug}\``,               inline: true },
        { name: 'Tier',        value: spirit.tier,                        inline: true },
        { name: 'Types',       value: spirit.types.join(' / '),           inline: true },
        { name: 'Creator',     value: `<@${submission.submitterId}>`,     inline: true },
        { name: 'Stats',       value: `HP **${spirit.baseStats.hp}** · ATK **${spirit.baseStats.atk}** · DEF **${spirit.baseStats.def}** · SPD **${spirit.baseStats.spd}**`, inline: false },
      )
      .setFooter({ text: 'Creator has been DM\'d and received a locked copy.' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
