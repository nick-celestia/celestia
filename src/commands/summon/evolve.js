const { findOwnedSpirit } = require('../../services/spiritService');
const { getOrCreateUser } = require('../../services/userService');
const Spirit = require('../../models/Spirit');

module.exports = {
  name: 'evolve',
  aliases: [],
  description: 'Use Celestial Stone to evolve a Mythic/Celestial spirit if an evolved form is configured.',
  async execute({ message, args }) {
    const id = args[0];
    if (!id) return message.reply('Use: `c evolve <spiritId>`');
    const owned = await findOwnedSpirit(message.author.id, id);
    if (!owned) return message.reply('Spirit not found.');
    if (!['Mythic', 'Celestial'].includes(owned.spirit.tier)) {
      return message.reply('Only Mythic and Celestial spirits can evolve.');
    }
    const requiredLevel = owned.spirit.tier === 'Mythic' ? 50 : 75;
    if (owned.level < requiredLevel) return message.reply(`This spirit must reach level ${requiredLevel} before evolution.`);
    if (!owned.spirit.evolvesTo) return message.reply('This spirit has no evolved form configured yet.');

    const user = await getOrCreateUser(message.author.id);
    if ((user.items.celestial_stone || 0) < 1) return message.reply('You need a Celestial Stone from official events.');
    const evolved = await Spirit.findById(owned.spirit.evolvesTo);
    if (!evolved) return message.reply('Evolved form is missing from the database. Ask an admin to fix it.');

    user.items.celestial_stone -= 1;
    owned.spirit = evolved._id;
    owned.level = 1;
    owned.xp = 0;
    owned.nickname = null;
    await user.save();
    await owned.save();

    await message.reply(`✨ Evolution complete! Your spirit evolved into ${evolved.emoji} **${evolved.name}**. Level reset to 1 for the evolved form.`);
  }
};
