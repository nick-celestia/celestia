const UserSpirit = require('../../models/UserSpirit');
const { findOwnedSpirit, sellValueForTier } = require('../../services/spiritService');
const { getOrCreateUser } = require('../../services/userService');
const { fmt } = require('../../utils/format');

function teamIds(user) {
  return [user.team.slot1, user.team.slot2, user.team.slot3].filter(Boolean);
}

module.exports = {
  name: 'sell',
  aliases: ['release'],
  description: 'Sell one spirit or duplicate spirits for Mana.',
  async execute({ message, args }) {
    const user = await getOrCreateUser(message.author.id);
    const team = teamIds(user);

    if (args[0] === 'duplicates') {
      const all = await UserSpirit.find({ ownerId: message.author.id, locked: false, shortId: { $nin: team } }).populate('spirit');
      const groups = new Map();
      for (const us of all) {
        const k = String(us.spirit._id);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(us);
      }
      let sold = 0;
      let mana = 0;
      for (const group of groups.values()) {
        group.sort((a, b) => a.createdAt - b.createdAt);
        const duplicates = group.slice(1);
        for (const us of duplicates) {
          mana += sellValueForTier(us.spirit.tier);
          sold += 1;
          await us.deleteOne();
        }
      }
      user.mana += mana;
      await user.save();
      return message.reply(`✅ Sold **${sold}** duplicate spirits for **${fmt(mana)} Mana**. Total Mana: **${fmt(user.mana)}**`);
    }

    const id = args[0];
    if (!id) return message.reply('Use: `c sell <spiritId>` or `c sell duplicates`');
    const owned = await findOwnedSpirit(message.author.id, id);
    if (!owned) return message.reply('Spirit not found.');
    if (owned.locked) return message.reply('This spirit is locked. Use `c unlock <id>` first.');
    if (team.includes(owned.shortId)) return message.reply('This spirit is in your team. Remove it before selling.');

    const value = sellValueForTier(owned.spirit.tier);
    user.mana += value;
    await user.save();
    await owned.deleteOne();
    await message.reply(`✅ Sold **${owned.spirit.name}** for **${fmt(value)} Mana**. Total Mana: **${fmt(user.mana)}**`);
  }
};
