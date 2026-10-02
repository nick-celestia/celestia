const { coinflip } = require('../../services/gameService');
const { checkCooldown, formatCooldown } = require('../../services/cooldownService');
const { ECONOMY } = require('../../config/game');
const { logEvent } = require('../../services/logService');
const { fmt } = require('../../utils/format');

module.exports = {
  name: 'coinflip',
  aliases: ['cf'],
  description: 'Bet Mana on heads or tails.',
  async execute({ client, message, args }) {
    const cooldown = checkCooldown(message.author.id, 'games', ECONOMY.gameCooldownSeconds);
    if (!cooldown.ok) return message.reply(`⏳ Game cooldown: **${formatCooldown(cooldown.remainingMs)}**`);

    const result = await coinflip(message.author.id, args[0], args[1]);
    if (!result.ok) return message.reply(result.reason);

    await logEvent(client, {
      type: 'game_coinflip',
      userId: message.author.id,
      guildId: message.guild.id,
      message: `${message.author.tag} bet ${result.bet} on ${result.pick}; result ${result.result}; payout ${result.payout}`,
      data: { bet: result.bet, pick: result.pick, result: result.result, payout: result.payout }
    });

    await message.reply(`🪙 **Coinflip**
Your pick: **${result.pick}**
Result: **${result.result}**
${result.won ? `✅ You won! Payout: **${fmt(result.payout)} Mana**` : `❌ You lost **${fmt(result.bet)} Mana**`}
Balance: **${fmt(result.user.mana)} Mana**`);
  }
};
