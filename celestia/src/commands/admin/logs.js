const Log = require('../../models/Log');

module.exports = {
  name: 'logs',
  aliases: ['botlogs'],
  helperOnly: true,
  description: 'Helper: show latest security/game logs.',
  async execute({ message }) {
    const logs = await Log.find({ guildId: message.guild.id }).sort({ createdAt: -1 }).limit(10);
    if (!logs.length) return message.reply('No logs yet.');
    const lines = logs.map((l) => `\`${l.createdAt.toISOString()}\` **${l.type}** ${l.userId ? `<@${l.userId}>` : ''} — ${l.message}`);
    await message.reply(`🧾 **Latest Logs**\n${lines.join('\n')}`);
  }
};
