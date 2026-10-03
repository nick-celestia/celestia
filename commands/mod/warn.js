const { EmbedBuilder } = require('discord.js');
const { mentionToId } = require('../../utils/args');
const { logEvent }    = require('../../services/logService');
const Warning         = require('../../models/Warning');

// c warn @user <reason>
// Stores the warning in DB. Player gets a DM. Warning count shown in playerprofile.

module.exports = {
  name: 'warn',
  aliases: ['warning'],
  helperOnly: true,
  description: 'Warn a player with a reason. Helper+.',

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c warn @user <reason>`');

    const reason = args.slice(1).join(' ').trim();
    if (!reason) return message.reply('Please provide a reason for the warning.');

    if (userId === message.author.id) return message.reply('You cannot warn yourself.');

    // Save warning to DB
    const warning = await Warning.create({
      userId,
      guildId:   message.guild?.id || null,
      reason,
      issuedBy:  message.author.id,
      issuedAt:  new Date()
    });

    const totalWarnings = await Warning.countDocuments({ userId });

    // Log it
    await logEvent(client, {
      type:    'warn',
      userId,
      guildId: message.guild?.id || null,
      message: `Warned by <@${message.author.id}>. Reason: ${reason}. Total warnings: ${totalWarnings}.`,
      data:    { reason, issuedBy: message.author.id, warningId: warning._id }
    });

    // DM the player
    try {
      const user = await client.users.fetch(userId);
      await user.send(
        `⚠️ **You have received a warning in ${message.guild?.name || 'Celestia'}.**\n\n` +
        `**Reason:** ${reason}\n` +
        `**Total warnings:** ${totalWarnings}\n\n` +
        `Repeated violations may result in a timeout or ban.`
      );
    } catch { /* DMs off — warning still logged */ }

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle('⚠️ Player Warned')
      .addFields(
        { name: 'Player',          value: `<@${userId}>`,             inline: true },
        { name: 'Warned by',       value: `<@${message.author.id}>`,  inline: true },
        { name: 'Total Warnings',  value: `${totalWarnings}`,         inline: true },
        { name: 'Reason',          value: reason,                     inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
