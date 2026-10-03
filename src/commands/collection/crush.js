const { EmbedBuilder } = require('discord.js');
const PlayerWeapon     = require('../../models/PlayerWeapon');
const { getOrCreateUser } = require('../../services/userService');
const { WEAPONS }      = require('../../config/weapons');

const STARDUST_EMOJI   = '✨';   // replace with <:stardust:ID> when uploaded
const CRUSH_VALUES     = { Common: 1, Uncommon: 3, Rare: 8, Epic: 20, Legendary: 50, Mythic: 150 };

// ── Crush helpers ─────────────────────────────────────────────────────────────
async function docrush(userId, weaponDocs) {
  const total = weaponDocs.reduce((s, w) => s + (CRUSH_VALUES[w.rarity] || 1), 0);
  await PlayerWeapon.deleteMany({ _id: { $in: weaponDocs.map(w => w._id) } });
  const user            = await getOrCreateUser(userId);
  user.stardust          = (user.stardust || 0) + total;
  // Track total ever accumulated for leaderboard
  user.stardustTotal     = (user.stardustTotal || 0) + total;
  await user.save();
  return { total, user };
}

// ── c crush <weaponShortId>          → crush one weapon
// ── c crush <rarity>                 → bulk crush all unequipped of that rarity
// ── c crush all                      → crush ALL unequipped weapons
// ── c crush                          → show help

module.exports = {
  name: 'crush',
  aliases: ['dismantle', 'smash'],
  description: 'Crush weapons to earn Stardust ✨.',

  async execute({ message, args, prefix }) {
    const sub = args[0]?.toLowerCase();

    // ── c crush all ───────────────────────────────────────────────────────────
    if (sub === 'all') {
      const weapons = await PlayerWeapon.find({ ownerId: message.author.id, equippedOn: null });
      if (!weapons.length) return message.reply('No unequipped weapons to crush.');

      const { total } = await docrush(message.author.id, weapons);

      const embed = new EmbedBuilder()
        .setColor(0xB8860B)
        .setTitle('🔨 All Weapons Crushed')
        .setDescription(`Crushed **${weapons.length}** weapon${weapons.length === 1 ? '' : 's'}\nEarned **${total} Stardust** ${STARDUST_EMOJI}`)
        .setFooter({ text: `${prefix}stardust to check balance` });

      return message.reply({ embeds: [embed] });
    }

    // ── c crush <rarity> ─────────────────────────────────────────────────────
    const rarities = ['common','uncommon','rare','epic','legendary'];
    if (sub && rarities.includes(sub)) {
      const rarity  = sub[0].toUpperCase() + sub.slice(1);
      const weapons = await PlayerWeapon.find({ ownerId: message.author.id, rarity, equippedOn: null });
      if (!weapons.length) return message.reply(`No unequipped **${rarity}** weapons to crush.`);

      const { total } = await docrush(message.author.id, weapons);

      const embed = new EmbedBuilder()
        .setColor(0xB8860B)
        .setTitle('🔨 Weapons Crushed')
        .setDescription(`Crushed **${weapons.length} ${rarity}** weapon${weapons.length === 1 ? '' : 's'}\nEarned **${total} Stardust** ${STARDUST_EMOJI}`)
        .setFooter({ text: `${prefix}stardust to check balance` });

      return message.reply({ embeds: [embed] });
    }

    // ── c crush <weaponShortId> ───────────────────────────────────────────────
    if (sub) {
      const weaponShortId = sub.toUpperCase();
      const weapon = await PlayerWeapon.findOne({ ownerId: message.author.id, shortId: weaponShortId });
      if (!weapon) return message.reply(`You do not own weapon \`${weaponShortId}\`. Check \`${prefix}weapons\`.`);
      if (weapon.equippedOn) return message.reply(`Unequip \`${weaponShortId}\` from \`${weapon.equippedOn}\` before crushing.`);

      const shards    = CRUSH_VALUES[weapon.rarity] || 1;
      const weaponDef = WEAPONS[weapon.weaponId];

      const { user } = await docrush(message.author.id, [weapon]);

      const embed = new EmbedBuilder()
        .setColor(0xB8860B)
        .setTitle('🔨 Weapon Crushed')
        .setDescription(
          `**${weaponDef?.emoji || '⚔️'} ${weaponDef?.name || weapon.weaponId}** \`${weaponShortId}\`\n` +
          `Stat: **${(weapon.rolledStat * 100).toFixed(1)}%** · ${weapon.rarity}\n\n` +
          `Earned **${shards} Stardust** ${STARDUST_EMOJI}\n` +
          `New balance: **${user.stardust}** ${STARDUST_EMOJI}`
        )
        .setFooter({ text: `${prefix}stardust to use Stardust for spirit XP` });

      return message.reply({ embeds: [embed] });
    }

    // ── help ──────────────────────────────────────────────────────────────────
    const crushTable = Object.entries(CRUSH_VALUES)
      .filter(([r]) => r !== 'Mythic')
      .map(([r, v]) => `${r}: **${v}** ${STARDUST_EMOJI}`)
      .join(' · ');

    return message.reply(
      `**🔨 Crush Weapons for Stardust ${STARDUST_EMOJI}**\n\n` +
      `\`${prefix}crush <weaponId>\` — crush one weapon\n` +
      `\`${prefix}crush common\` — crush all unequipped Common weapons\n` +
      `\`${prefix}crush all\` — crush ALL unequipped weapons\n\n` +
      `**Stardust values:**\n${crushTable}\n\n` +
      `Use Stardust to give XP to spirits: \`${prefix}stardust <spiritId> <amount>\``
    );
  }
};
