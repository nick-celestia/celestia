const { EmbedBuilder }    = require('discord.js');
const UserSpirit          = require('../../models/UserSpirit');
const { WEAPONS }         = require('../../config/weapons');
const { mentionToId }     = require('../../utils/args');

// c equip <spiritId> weapon <weaponId>
// c equip <spiritId> artifact <artifactId>   (future)
// c unequip <spiritId> weapon
// c weapons                                  → list all weapons you own (placeholder until item inv built)

module.exports = {
  name: 'equip',
  aliases: ['weapon', 'unequip'],
  description: 'Equip or unequip a weapon on a spirit.',

  async execute({ message, args, prefix }) {
    const sub = args[0]?.toLowerCase();

    // ── c equip weapons (list all available weapons) ──────────────────────────
    if (sub === 'weapons' || sub === 'list') {
      const lines = Object.values(WEAPONS).map(w =>
        `${w.emoji} **${w.name}** \`${w.id}\` · ${w.rarity} · ${w.wpCost > 0 ? `${w.wpCost} WP` : 'Passive'}\n${w.description}`
      );
      // Split into two fields if too long
      const half  = Math.ceil(lines.length / 2);
      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('⚔️ Celestia Weapons')
        .addFields(
          { name: 'Weapons (1)', value: lines.slice(0, half).join('\n\n') || 'None', inline: false },
          { name: 'Weapons (2)', value: lines.slice(half).join('\n\n') || 'None', inline: false },
        )
        .setFooter({ text: `${prefix}equip <spiritId> weapon <weaponId> to equip` });
      return message.reply({ embeds: [embed] });
    }

    const spiritId = args[0]?.toUpperCase();
    const slot     = args[1]?.toLowerCase();   // 'weapon' | 'artifact'
    const weaponId = args[2]?.toLowerCase();

    // ── c unequip <spiritId> weapon ───────────────────────────────────────────
    if (message.content.includes('unequip') || weaponId === 'none' || weaponId === 'remove') {
      if (!spiritId || !slot) return message.reply(`Usage: \`${prefix}unequip <spiritId> weapon\``);

      const owned = await UserSpirit.findOne({ ownerId: message.author.id, shortId: spiritId }).populate('spirit');
      if (!owned) return message.reply('You do not own that spirit.');

      if (!owned.equipment) owned.equipment = {};
      owned.equipment[slot] = null;
      owned.markModified('equipment');
      await owned.save();

      return message.reply(`✅ Removed **${slot}** from **${owned.nickname || owned.spirit.name}**.`);
    }

    // ── c equip <spiritId> weapon <weaponId> ─────────────────────────────────
    if (!spiritId || !slot || !weaponId) {
      return message.reply(
        `**Usage:**\n` +
        `\`${prefix}equip <spiritId> weapon <weaponId>\` — equip a weapon\n` +
        `\`${prefix}unequip <spiritId> weapon\` — remove weapon\n` +
        `\`${prefix}equip list\` — see all weapons\n\n` +
        `Example: \`${prefix}equip EMB1 weapon iron_fang\``
      );
    }

    if (!['weapon', 'artifact'].includes(slot)) {
      return message.reply('Slot must be `weapon` or `artifact`.');
    }

    const weaponDef = WEAPONS[weaponId];
    if (!weaponDef) {
      return message.reply(`Unknown weapon \`${weaponId}\`. Use \`${prefix}equip list\` to see all weapons.`);
    }

    const owned = await UserSpirit.findOne({ ownerId: message.author.id, shortId: spiritId }).populate('spirit');
    if (!owned) return message.reply('You do not own that spirit.');

    // TODO: check player inventory for weapon ownership (when inventory system is built)
    // For now, all weapons are available (admin gives via giveitem when inventory is added)

    if (!owned.equipment) owned.equipment = {};
    owned.equipment.weapon = weaponId;
    owned.markModified('equipment');
    await owned.save();

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle('⚔️ Weapon Equipped')
      .setDescription(`${owned.spirit.emoji} **${owned.nickname || owned.spirit.name}** now wields **${weaponDef.emoji} ${weaponDef.name}**`)
      .addFields(
        { name: 'Effect',   value: weaponDef.description, inline: false },
        { name: 'Rarity',   value: weaponDef.rarity,      inline: true  },
        { name: 'WP Cost',  value: weaponDef.wpCost > 0 ? `${weaponDef.wpCost} WP` : 'Passive — no cost', inline: true },
      )
      .setFooter({ text: `WP (Weapon Points) = your spirit's SPD stat at battle start` });

    await message.reply({ embeds: [embed] });
  }
};
