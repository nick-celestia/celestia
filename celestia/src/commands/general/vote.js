const { EmbedBuilder } = require('discord.js');
const { getUserVoteCounts } = require('../../services/voteService');
const env = require('../../config/env');

module.exports = {
  name: 'vote',
  aliases: ['upvote', 'votebot'],
  description: 'Vote for Celestia on top.gg and earn Mana rewards.',

  async execute({ message }) {
    const { total, monthly } = await getUserVoteCounts(message.author.id);
    const botId = env.topggBotId || 'YOUR_BOT_ID';

    const embed = new EmbedBuilder()
      .setColor(0xFF3366)
      .setTitle('⭐ Vote for Celestia!')
      .setDescription(
        `Voting helps Celestia reach more players and costs you nothing.\n\n` +
        `**Rewards per vote:**\n` +
        `🔮 **200 Mana**\n` +
        `🎉 **400 Mana** on weekends (top.gg doubles!)\n\n` +
        `🔗 **[Click here to vote](https://top.gg/bot/${botId}/vote)**\n\n` +
        `You can vote every **12 hours**.`
      )
      .addFields(
        { name: '📊 Your Vote Stats',
          value: `Total votes: **${total}**\nThis month: **${monthly}**`,
          inline: true
        },
        { name: '🏆 Leaderboard',
          value: `Use \`c votelb\` to see the top voters!\nMonthly winners get special rewards.`,
          inline: true
        }
      )
      .setFooter({ text: 'Thank you for supporting Celestia! 💙' });

    await message.reply({ embeds: [embed] });
  }
};
