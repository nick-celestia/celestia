const { EmbedBuilder } = require('discord.js');
const { mentionToId } = require('../../utils/args');
const Warning         = require('../../models/Warning');

// c warnings @user       — view all warnings for a player
// c warnings @user clear — clear all warnings (botAdminOnly)

module.exports = {
  name: 'warnings',
  aliases: ['warns', 'warnlog'],
  helperOnly: true,
  description: 'View or clear warnings for a player.',

  async execute({ message, args, isBotAdmin }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c warnings @user` or `c warnings @user clear`');

    const sub = args[1]?.toLowerCase();

    if (sub === 'clear') {
      if (!isBotAdmin(message.author.id)) {
        return message.reply('Only bot admins can clear warnings.');
      }
      const result = await Warning.deleteMany({ userId });
      return message.reply(`✅ Cleared **${result.deletedCount}** warning(s) for <@${userId}>.`);
    }

    const warnings = await Warning.find({ userId }).sort({ issuedAt: -1 });

    if (!warnings.length) {
      return message.reply(`<@${userId}> has no warnings on record.`);
    }

    const lines = warnings.map((w, i) => {
      const date = w.issuedAt.toISOString().slice(0, 10);
      return `**${i + 1}.** \`${date}\` — ${w.reason} *(by <@${w.issuedBy}>)*`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`⚠️ Warnings for ${userId}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Total: ${warnings.length} • c warnings @user clear to remove all` });

    await message.reply({ embeds: [embed] });
  }
};
