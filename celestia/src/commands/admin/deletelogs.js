const Log = require('../../models/Log');
const { mentionToId } = require('../../utils/args');
const { logEvent } = require('../../services/logService');

// c deletelogs @user           — delete ALL logs for that user (requires confirm)
// c deletelogs @user confirm   — actually deletes after seeing the warning

module.exports = {
  name: 'deletelogs',
  aliases: ['clearlogs', 'purgelogs'],
  description: 'Permanently delete all logs for a player. Bot admin only.',
  botAdminOnly: true,

  async execute({ client, message, args }) {
    const userId = mentionToId(args[0]);
    if (!userId) return message.reply('Usage: `c deletelogs @user confirm`');

    const confirmed = args[1]?.toLowerCase() === 'confirm';

    const count = await Log.countDocuments({ userId });

    if (!confirmed) {
      return message.reply(
        `⚠️ This will permanently delete **${count} log entries** for <@${userId}>.\n` +
        `This action cannot be undone and removes your evidence trail for that player.\n\n` +
        `If you're sure, run: \`c deletelogs <@${userId}> confirm\``
      );
    }

    await Log.deleteMany({ userId });

    // Log the deletion itself under the admin's ID so there's a record of who cleared it
    await logEvent(client, {
      type:    'manual_log_deletion',
      userId:  message.author.id,
      guildId: message.guild?.id || null,
      message: `Admin <@${message.author.id}> deleted all ${count} logs for userId ${userId}.`,
      data:    { targetUserId: userId, deletedCount: count }
    });

    await message.reply(`🗑️ Deleted **${count} log entries** for <@${userId}>. This action has been logged under your account.`);
  }
};
