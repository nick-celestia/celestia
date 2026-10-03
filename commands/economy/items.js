const { getOrCreateUser } = require('../../services/userService');

module.exports = {
  name: 'items',
  aliases: ['item', 'inventoryitems'],
  description: 'View owned items.',
  async execute({ message }) {
    const user = await getOrCreateUser(message.author.id);
    await message.reply(`🎒 **Your Items**
Lucky Star: **${user.items.lucky_star || 0}**
Battle Charm: **${user.items.battle_charm || 0}**
Rename Scroll: **${user.items.rename_scroll || 0}**
Celestial Stone: **${user.items.celestial_stone || 0}**

**Active Effects**
Lucky Star summons left: **${user.effects.luckyStarSummons || 0}**
Battle Charm battles left: **${user.effects.battleCharmBattles || 0}**`);
  }
};
