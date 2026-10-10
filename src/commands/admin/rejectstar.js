const { EmbedBuilder }    = require('discord.js');
const { rejectSubmission } = require('../../services/starService');

// c rejectstar <submissionId> <reason>

module.exports = {
  name: 'rejectstar',
  aliases: ['stardecline', 'declinestar'],
  botAdminOnly: true,
  description: 'Reject a STAR custom spirit submission and refund the STAR token.',

  async execute({ client, message, args }) {
    const id     = args[0];
    const reason = args.slice(1).join(' ').trim();

    if (!id) return message.reply('Usage: `c rejectstar <submissionId> <reason>`\nGet IDs from `c reviewstar`.');
    if (!reason) return message.reply('Please provide a reason for the rejection.\nExample: `c rejectstar 66abc123 Stats too high for Custom tier.`');

    const result = await rejectSubmission(id, message.author.id, reason);
    if (!result.ok) return message.reply(`❌ ${result.reason}`);

    const { submission } = result;

    // DM the submitter with the reason and STAR refund notice
    try {
      const creator = await client.users.fetch(submission.submitterId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('❌ Your Custom Spirit Submission was Rejected')
        .setDescription(
          `**Spirit name:** ${submission.name} ${submission.emoji}\n\n` +
          `**Reason:** ${reason}\n\n` +
          `Your **1 STAR token** has been refunded to your account.\n` +
          `You can resubmit with changes using \`c submitstar\`.`
        )
        .setFooter({ text: 'Contact staff if you have questions about the rejection.' })
        .setTimestamp();
      await creator.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

    const embed = new EmbedBuilder()
      .setColor(0xFF4444)
      .setTitle('❌ Submission Rejected')
      .addFields(
        { name: 'Spirit Name', value: `${submission.emoji} ${submission.name}`, inline: true },
        { name: 'Submitter',   value: `<@${submission.submitterId}>`,          inline: true },
        { name: 'Reason',      value: reason,                                  inline: false },
      )
      .setFooter({ text: 'STAR token refunded. Creator has been DM\'d.' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
