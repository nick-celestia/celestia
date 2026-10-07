const { EmbedBuilder }    = require('discord.js');
const { mentionToId }     = require('../../utils/args');
const { getOrCreateUser } = require('../../services/userService');
const { logEvent }        = require('../../services/logService');

module.exports = {
  name: 'unbanuser',
  aliases: ['botunban'],
  botAdminOnly: true,
  description: 'Lift a bot ban from a player.',

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c unbanuser @user`');

    const user = await getOrCreateUser(userId);

    if (!user.security.permanentBan && (!user.security.bannedUntil || new Date(user.security.bannedUntil) <= new Date())) {
      return message.reply(`<@${userId}> is not currently banned.`);
    }

    user.security.permanentBan = false;
    user.security.bannedUntil  = null;
    user.security.banReason    = null;
    await user.save();

    await logEvent(client, {
      type:    'manual_unban',
      userId,
      guildId: message.guild?.id || null,
      message: `Unbanned by <@${message.author.id}>.`,
    });

    // ── Issue #17: DM the player about unban ─────────────────────────────────
    try {
      const discordUser = await client.users.fetch(userId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Your Celestia ban has been lifted')
        .setDescription('You can now use all Celestia commands again.')
        .setFooter({ text: 'Please follow the rules to avoid future bans.' })
        .setTimestamp();

      await discordUser.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Player Unbanned')
      .addFields(
        { name: 'Player', value: `<@${userId}>`,            inline: true },
        { name: 'By',     value: `<@${message.author.id}>`, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
