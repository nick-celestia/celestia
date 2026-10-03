const { EmbedBuilder } = require('discord.js');
const PlayerWeapon     = require('../../models/PlayerWeapon');
const { rerollWeapon } = require('../../services/weaponService');
const { WEAPONS }      = require('../../config/weapons');

// c reroll <weaponShortId>

module.exports = {
  name: 'reroll',
  aliases: ['weaponreroll', 'wrr'],
  description: 'Reroll a weapon\'s stat using Forge Shards.',

  async execute({ client, message, args, prefix }) {
    const weaponId = args[0]?.toUpperCase();
    if (!weaponId) return message.reply(`Usage: \`${prefix}reroll <weaponId>\`\nGet weapon IDs from \`${prefix}weapons\`.`);

    const weapon = await PlayerWeapon.findOne({ ownerId: message.author.id, shortId: weaponId });
    if (!weapon) return message.reply(`You do not own weapon \`${weaponId}\`. Check \`${prefix}weapons\` for your collection.`);

    const weaponDef = WEAPONS[weapon.weaponId];
    const oldPct    = (weapon.rolledStat * 100).toFixed(1);

    const result = await rerollWeapon(client, message.author.id, weaponId);
    if (!result.ok) return message.reply(result.reason);

    const newPct    = (result.newStat * 100).toFixed(1);
    const improved  = result.improved;
    const minPct    = ((weaponDef?.minStat || 0) * 100).toFixed(1);
    const maxPct    = ((weaponDef?.maxStat || 0) * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(improved ? 0x2ECC71 : 0xFF4444)
      .setTitle(`🎲 Weapon Rerolled — ${weaponDef?.emoji || '⚔️'} ${weaponDef?.name || weapon.weaponId}`)
      .addFields(
        { name: 'Old Stat', value: `**${oldPct}%**`, inline: true },
        { name: 'New Stat', value: `**${newPct}%** ${improved ? '⬆️' : '⬇️'}`, inline: true },
        { name: 'Range',    value: `${minPct}% – ${maxPct}%`, inline: true },
        { name: 'Cost',     value: `**${result.cost} Forge Shards** spent`, inline: false },
      )
      .setDescription(improved ? '✅ Improvement!' : '❌ Lower than before — try again!')
      .setFooter({ text: `${prefix}reroll ${weaponId} to try again • ${prefix}crush shards for balance` });

    await message.reply({ embeds: [embed] });
  }
};
