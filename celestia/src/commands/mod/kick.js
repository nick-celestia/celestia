const { EmbedBuilder } = require('discord.js');
const { mentionToId } = require('../../utils/args');
const { logEvent }    = require('../../services/logService');

// c kick @user <reason>

module.exports = {
  name: 'kick',
  aliases: ['removemember'],
  botAdminOnly: true,
  description: 'Kick a member from the server. Bot admin only.',

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c kick @user <reason>`');

    const reason = args.slice(1).join(' ').trim() || 'No reason provided.';

    if (userId === message.author.id) return message.reply('You cannot kick yourself.');
    if (userId === client.user.id)    return message.reply('I cannot kick myself.');

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return message.reply('Member not found in this server.');

    if (!member.kickable) {
      return message.reply('I cannot kick this member — they may have a higher role than me.');
    }

    // DM before kick so the message can actually be delivered
    try {
      const user = await client.users.fetch(userId);
      await user.send(
        `👢 **You have been kicked from ${message.guild.name}.**\n\n` +
        `**Reason:** ${reason}\n\n` +
        `You may rejoin using a valid invite link.`
      );
    } catch { /* DMs off */ }

    try {
      await member.kick(reason);
    } catch (err) {
      return message.reply(`❌ Failed to kick: ${err.message}`);
    }

    await logEvent(client, {
      type:    'kick',
      userId,
      guildId: message.guild?.id || null,
      message: `Kicked by <@${message.author.id}>. Reason: ${reason}`,
      data:    { reason, issuedBy: message.author.id }
    });

    const embed = new EmbedBuilder()
      .setColor(0xFF4444)
      .setTitle('👢 Member Kicked')
      .addFields(
        { name: 'Member',  value: `<@${userId}>`,            inline: true },
        { name: 'By',      value: `<@${message.author.id}>`, inline: true },
        { name: 'Reason',  value: reason,                    inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
