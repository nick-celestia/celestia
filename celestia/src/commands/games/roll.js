const { roll } = require('../../services/gameService');
const { checkCooldown, formatCooldown } = require('../../services/cooldownService');
const { ECONOMY } = require('../../config/game');
const { logEvent } = require('../../services/logService');
const { fmt } = require('../../utils/format');

module.exports = {
  name: 'roll',
  aliases: [],
  description: 'Roll 1-100 and win Mana based on payout table.',
  async execute({ client, message, args }) {
    const cooldown = checkCooldown(message.author.id, 'games', ECONOMY.gameCooldownSeconds);
    if (!cooldown.ok) return message.reply(`⏳ Game cooldown: **${formatCooldown(cooldown.remainingMs)}**`);

    const result = await roll(message.author.id, args[0]);
    if (!result.ok) return message.reply(result.reason);

    await logEvent(client, {
      type: 'game_roll',
      userId: message.author.id,
      guildId: message.guild.id,
      message: `${message.author.tag} bet ${result.bet}; rolled ${result.result}; multiplier ${result.multiplier}x; payout ${result.payout}`,
      data: { bet: result.bet, roll: result.result, multiplier: result.multiplier, payout: result.payout }
    });

    let outcome = '❌ You lost.';
    if (result.multiplier === 1) outcome = '➖ You got your bet back.';
    if (result.multiplier === 2) outcome = '✅ You doubled your bet!';
    if (result.multiplier === 5) outcome = '👑 JACKPOT! 5x payout!';

    await message.reply(`🎲 **Roll**
Roll: **${result.result}**
Multiplier: **${result.multiplier}x**
${outcome}
Payout: **${fmt(result.payout)} Mana**
Balance: **${fmt(result.user.mana)} Mana**`);
  }
};
