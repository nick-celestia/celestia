const { EmbedBuilder } = require('discord.js');

// Usage:
//   c announce #channel Your message here
//   c announce #channel title=Important Update | Your message here
//
// The message appears as a Celestia embed — no user mention, fully anonymous.
// ownerOnly so only you can use it.

module.exports = {
  name: 'announce',
  aliases: ['ann'],
  description: 'Send an anonymous announcement embed to any channel. Owner only.',
  ownerOnly: true,

  async execute({ message, args, rawArgs }) {
    // First arg must be a channel mention
    const channelMention = args[0];
    const channelId = channelMention?.replace(/[<#>]/g, '');
    if (!channelId) {
      return message.reply(
        'Usage: `c announce #channel Your message`\n' +
        'With title: `c announce #channel title=Patch Notes | Your message`'
      );
    }

    const channel = message.guild?.channels?.cache.get(channelId)
      || await message.client.channels.fetch(channelId).catch(() => null);

    if (!channel) return message.reply('❌ Channel not found.');

    // Everything after the channel mention
    const body = rawArgs.slice(channelMention.length).trim();
    if (!body) return message.reply('❌ Please provide a message after the channel.');

    // Optional title= prefix
    let title = '📢 Celestia Announcement';
    let content = body;

    const titleMatch = body.match(/^title=(.+?)\s*\|\s*([\s\S]+)$/i);
    if (titleMatch) {
      title   = titleMatch[1].trim();
      content = titleMatch[2].trim();
    }

    const embed = new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle(title)
      .setDescription(content)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Quietly confirm and delete the command trigger
    const confirm = await message.reply(`✅ Announcement sent to <#${channelId}>.`);
    setTimeout(() => {
      confirm.delete().catch(() => null);
      message.delete().catch(() => null);
    }, 4000);
  }
};
