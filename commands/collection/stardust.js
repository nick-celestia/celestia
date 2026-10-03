const { EmbedBuilder }     = require('discord.js');
const UserSpirit           = require('../../models/UserSpirit');
const { getOrCreateUser }  = require('../../services/userService');
const { applyXp, xpNeededForLevel } = require('../../utils/stats');

// ── Stardust config ───────────────────────────────────────────────────────────
// 1 Stardust = how many XP points
const STARDUST_TO_XP = 5;   // 100 Stardust = 500 XP
const STARDUST_EMOJI = '<:stardust:STARDUST_EMOJI_ID>';  // replace with real ID when ready
const STARDUST_FALLBACK = '✨';  // unicode fallback until emoji uploaded

function sdEmoji() {
  // Returns custom emoji if configured, falls back to unicode
  return STARDUST_EMOJI.includes('STARDUST_EMOJI_ID') ? STARDUST_FALLBACK : STARDUST_EMOJI;
}

// ── c stardust                       → view balance
// ── c stardust <spiritId> <amount>   → convert Stardust to spirit XP

module.exports = {
  name: 'stardust',
  aliases: ['sd', 'dust'],
  description: 'Check your Stardust or convert it to spirit XP.',

  async execute({ client, message, args, prefix }) {
    const user = await getOrCreateUser(message.author.id);

    // ── c stardust (no args) — view balance ──────────────────────────────────
    if (!args[0]) {
      const balance = user.stardust || 0;

      // Show what 100 SD / 500 SD / 1000 SD converts to
      const conversionTable = [100, 500, 1000, 2000]
        .map(sd => `**${sd}** ${sdEmoji()} → **${sd * STARDUST_TO_XP} XP**`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xB8860B)
        .setTitle(`${sdEmoji()} Your Stardust`)
        .addFields(
          { name: 'Balance',         value: `**${balance}** Stardust ${sdEmoji()}`, inline: false },
          { name: 'Conversion Rate', value: `1 ${sdEmoji()} = **${STARDUST_TO_XP} XP**`, inline: true },
          { name: 'How to earn',     value: 'Crush unwanted weapons with `c crush`', inline: true },
          { name: 'Conversion Table',value: conversionTable, inline: false },
        )
        .setFooter({ text: `${prefix}stardust <spiritId> <amount> to give XP to a spirit` });

      return message.reply({ embeds: [embed] });
    }

    // ── c stardust <spiritId> <amount> — convert to XP ───────────────────────
    const spiritId = args[0].toUpperCase();
    const amount   = parseInt(args[1]);

    if (!amount || amount <= 0 || isNaN(amount)) {
      return message.reply(
        `Usage: \`${prefix}stardust <spiritId> <amount>\`\n` +
        `Example: \`${prefix}stardust EMB1 100\` — uses 100 ${sdEmoji()} to give **${100 * STARDUST_TO_XP} XP** to Ember Lynx`
      );
    }

    const balance = user.stardust || 0;
    if (balance < amount) {
      return message.reply(
        `❌ You only have **${balance} Stardust** ${sdEmoji()}. You need **${amount}** for this.\n` +
        `Crush weapons with \`${prefix}crush\` to earn more.`
      );
    }

    // Find the spirit
    const spirit = await UserSpirit.findOne({ ownerId: message.author.id, shortId: spiritId }).populate('spirit');
    if (!spirit) return message.reply(`You do not own a spirit with ID \`${spiritId}\`. Check \`${prefix}col\` for your collection.`);

    const xpGain    = amount * STARDUST_TO_XP;
    const levelBefore = spirit.level;
    const xpBefore    = spirit.xp;

    const levelsGained = applyXp(spirit, xpGain);
    await spirit.save();

    user.stardust = balance - amount;
    // Track total accumulated stardust spent (for leaderboard)
    user.stardustSpent = (user.stardustSpent || 0) + amount;
    await user.save();

    const leveledText = levelsGained > 0
      ? `\n🎉 **Level Up!** ${spirit.spirit.name} grew from Lv.**${levelBefore}** → Lv.**${spirit.level}**`
      : ``;

    const xpToNext = xpNeededForLevel(spirit.level);

    const embed = new EmbedBuilder()
      .setColor(0xB8860B)
      .setTitle(`${sdEmoji()} Stardust → XP`)
      .setDescription(`${spirit.spirit.emoji} **${spirit.nickname || spirit.spirit.name}** \`${spirit.shortId}\``)
      .addFields(
        { name: 'Stardust Used',  value: `**${amount}** ${sdEmoji()}`,                    inline: true },
        { name: 'XP Gained',      value: `**+${xpGain} XP**`,                             inline: true },
        { name: 'Remaining Dust', value: `**${user.stardust}** ${sdEmoji()}`,             inline: true },
        { name: 'Spirit Level',   value: `Lv.**${spirit.level}** · ${spirit.xp}/${xpToNext} XP to next`, inline: false },
      )
      .setDescription(`${spirit.spirit.emoji} **${spirit.nickname || spirit.spirit.name}** \`${spirit.shortId}\`${leveledText}`)
      .setFooter({ text: `${prefix}spirit ${spiritId} for full spirit details` });

    await message.reply({ embeds: [embed] });
  }
};
