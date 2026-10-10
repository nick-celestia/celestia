const { EmbedBuilder }  = require('discord.js');
const StarSubmission    = require('../../models/StarSubmission');

// c reviewstar              → list all pending submissions
// c reviewstar all          → list all (including approved/rejected)
// c reviewstar <id>         → view one submission detail

module.exports = {
  name: 'reviewstar',
  aliases: ['starreview', 'pendingstar'],
  botAdminOnly: true,
  description: 'View pending STAR custom spirit submissions.',

  async execute({ client, message, args, prefix }) {
    const sub = args[0]?.toLowerCase();

    // ── Single submission detail ───────────────────────────────────────────────
    if (args[0] && args[0].length > 8) {
      const submission = await StarSubmission.findById(args[0]).catch(() => null);
      if (!submission) return message.reply(`❌ No submission found with ID \`${args[0]}\`.`);

      let submitterName = submission.submitterId;
      try { submitterName = (await client.users.fetch(submission.submitterId)).username; } catch {}

      const statsLine = `HP **${submission.baseStats.hp}** · ATK **${submission.baseStats.atk}** · DEF **${submission.baseStats.def}** · SPD **${submission.baseStats.spd}**`;
      const statusColor = submission.status === 'approved' ? 0x2ECC71 : submission.status === 'rejected' ? 0xFF4444 : 0xF1C40F;

      const embed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle(`⭐ Submission: ${submission.name}`)
        .addFields(
          { name: 'Status',     value: submission.status.toUpperCase(),    inline: true },
          { name: 'Submitter',  value: `${submitterName} (${submission.submitterId})`, inline: true },
          { name: 'Emoji',      value: submission.emoji,                   inline: true },
          { name: 'Types',      value: submission.types.join(' / '),       inline: true },
          { name: 'Tier',       value: submission.tier,                    inline: true },
          { name: 'Stats',      value: statsLine,                          inline: false },
          { name: 'Submitted',  value: `<t:${Math.floor(new Date(submission.createdAt).getTime()/1000)}:R>`, inline: true },
        )
        .setDescription(`**ID:** \`${submission._id}\``)
        .setFooter({ text: `${prefix}approvestar ${submission._id} | ${prefix}rejectstar ${submission._id} <reason>` });

      if (submission.reason) embed.addFields({ name: 'Reject Reason', value: submission.reason, inline: false });

      return message.reply({ embeds: [embed] });
    }

    // ── List submissions ───────────────────────────────────────────────────────
    const filter    = sub === 'all' ? {} : { status: 'pending' };
    const submissions = await StarSubmission.find(filter).sort({ createdAt: -1 }).limit(15);

    if (!submissions.length) {
      return message.reply(sub === 'all' ? 'No submissions found.' : '✅ No pending submissions.');
    }

    const lines = await Promise.all(submissions.map(async (s, i) => {
      let name = s.submitterId;
      try { name = (await client.users.fetch(s.submitterId)).username; } catch {}
      const statusIcon = s.status === 'approved' ? '✅' : s.status === 'rejected' ? '❌' : '⏳';
      const ts = Math.floor(new Date(s.createdAt).getTime() / 1000);
      return `${statusIcon} **${s.name}** ${s.emoji} · ${s.types.join('/')} · by ${name} · <t:${ts}:R>\n\`${s._id}\``;
    }));

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(`⭐ STAR Submissions${sub === 'all' ? ' (All)' : ' (Pending)'}`)
      .setDescription(lines.join('\n\n') || 'None.')
      .setFooter({ text: `${prefix}reviewstar <id> for details • ${prefix}approvestar <id> • ${prefix}rejectstar <id> <reason>` });

    return message.reply({ embeds: [embed] });
  }
};
