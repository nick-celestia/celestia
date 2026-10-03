const { findOwnedSpirit } = require('../../services/spiritService');
const { battleStats, powerScore } = require('../../utils/stats');

module.exports = {
  name: 'spirit',
  aliases: ['pet'],
  description: 'Show detailed spirit info.',
  async execute({ message, args }) {
    const id = args[0];
    if (!id) return message.reply('Use: `c spirit <spiritId>`');
    const owned = await findOwnedSpirit(message.author.id, id);
    if (!owned) return message.reply('Spirit not found in your collection.');
    const s = owned.spirit;
    const battle = battleStats(s.baseStats, owned.level);
    await message.reply(`${s.emoji} **${owned.nickname || s.name}** \`${owned.shortId}\`
Original Name: ${s.name}
Tier: **${s.tier}**
Type: **${s.types.join(' / ')}**
Level: **${owned.level}** | XP: **${owned.xp}**
Locked: **${owned.locked ? 'Yes' : 'No'}**
Tag: **${owned.cosmeticTag || 'None'}** | Aura: **${owned.aura || 'None'}**

**Base Stats**
HP ${s.baseStats.hp} • ATK ${s.baseStats.atk} • DEF ${s.baseStats.def} • SPD ${s.baseStats.spd}
Power Score: ${powerScore(s.baseStats).toFixed(1)}

**Battle Stats at Lv.${owned.level}**
HP ${battle.hp} • ATK ${battle.atk} • DEF ${battle.def} • SPD ${battle.spd}`);
  }
};
