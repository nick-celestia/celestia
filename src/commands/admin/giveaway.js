const Giveaway = require('../../models/Giveaway');
const { buildActiveEmbed, buildJoinButton } = require('../../services/giveawayService');

// Usage:
//   c giveaway <prize>              → 24h, 1 winner (defaults)
//   c giveaway <prize> winners=2   → 24h, 2 winners
//
// Only bot admins or server admins can start giveaways.

module.exports = {
  name: 'giveaway',
  aliases: ['gw'],
  description: 'Start a 24-hour giveaway in this channel.',
  adminOnly: true,

  async execute({ message, args, rawArgs }) {
    if (!rawArgs) return message.reply('Usage: `c giveaway <prize>` or `c giveaway <prize> winners=2`');

    // Parse optional winners= flag
    let winnerCount = 1;
    const winnerMatch = rawArgs.match(/winners=(\d+)/i);
    if (winnerMatch) {
      winnerCount = Math.min(Math.max(parseInt(winnerMatch[1]), 1), 20); // clamp 1-20
    }

    // Prize is everything except the winners= flag
    const prize = rawArgs.replace(/winners=\d+/i, '').trim();
    if (!prize) return message.reply('Please provide a prize name. Example: `c giveaway 500 Mana winners=1`');

    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Create DB record first (no messageId yet)
    const giveaway = await Giveaway.create({
      guildId:      message.guild.id,
      channelId:    message.channel.id,
      hostedBy:     message.author.id,
      hostedByTag:  message.author.username,
      prize,
      winnerCount,
      endsAt,
      participants: []
    });

    // Send the giveaway message
    const sent = await message.channel.send({
      embeds: [buildActiveEmbed(giveaway)],
      components: [buildJoinButton()]
    });

    // Save the message ID so the service can edit it later
    giveaway.messageId = sent.id;
    await giveaway.save();

    // Delete the command trigger to keep the channel clean
    await message.delete().catch(() => null);
  }
};
