const GuildConfig = require('../../models/GuildConfig');
const { manualAnnounce } = require('../../services/voteAnnouncer');

// c setvotechannel #channel     — sets where monthly leaderboard auto-posts
// c setvotechannel off          — disables auto-announce for this server
// c setvotechannel test         — immediately posts this month's leaderboard (owner only)

module.exports = {
  name: 'setvotechannel',
  aliases: ['votechannel'],
  botadminOnly: true,
  description: 'Set the channel for monthly vote leaderboard announcements.',

  async execute({ client, message, args }) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'off' || sub === 'disable') {
      await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { voteAnnouncementChannelId: null },
        { upsert: true }
      );
      return message.reply('✅ Monthly vote announcements disabled for this server.');
    }

    if (sub === 'test') {
      // Owner only for test
      if (!message.client.isOwner?.(message.author.id)) {
        return message.reply('Only the bot owner can trigger a test announcement.');
      }
      await manualAnnounce(client, message);
      return;
    }

    const channelMention = args[0];
    const channelId      = channelMention?.replace(/[<#>]/g, '');
    const channel        = channelId && message.guild.channels.cache.get(channelId);

    if (!channel) {
      return message.reply(
        `Usage:\n` +
        `\`c setvotechannel #channel\` — set the announcement channel\n` +
        `\`c setvotechannel off\` — disable announcements\n` +
        `\`c setvotechannel test\` — post this month's leaderboard now (owner only)`
      );
    }

    await GuildConfig.findOneAndUpdate(
      { guildId: message.guild.id },
      { voteAnnouncementChannelId: channel.id },
      { upsert: true }
    );

    return message.reply(
      `✅ Monthly vote leaderboard will be announced in <#${channel.id}> on the 1st of every month.\n` +
      `Use \`c setvotechannel test\` to preview it now.`
    );
  }
};
