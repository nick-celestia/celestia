const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { summon }              = require('../../services/summonService');
const { checkCooldown, formatCooldown } = require('../../services/cooldownService');
const { ECONOMY }             = require('../../config/game');
const { powerScore }          = require('../../utils/stats');
const { fmt }                 = require('../../utils/format');
const { findSpiritArtwork }   = require('../../utils/spiritArtwork');
const { awardPlayerXp }       = require('../../services/playerLevelService');
const { getOrCreateUser }     = require('../../services/userService');

const RARITY_COLORS = {
  Common:    0xBFC5CE,
  Uncommon:  0x43B581,
  Rare:      0x3498DB,
  Epic:      0x9B59B6,
  Custom:    0x19D3C5,
  Legendary: 0xF1C40F,
  Mythic:    0xE84393,
  Celestial: 0xD8F4FF,
  Ascended:  0xFFFFFF,
};

// ── Build summon embed ────────────────────────────────────────────────────────
function buildSummonEmbed(spirit, userSpirit, user) {
  const embed = new EmbedBuilder()
    .setColor(RARITY_COLORS[spirit.tier] || 0x8E9AAF)
    .setTitle('✨ A spirit answered your call!')
    .setDescription(
      `${spirit.emoji} **${spirit.name}**\n` +
      `**${spirit.tier}** • **${spirit.types.join(' / ')}**`
    )
    .addFields(
      {
        name:  'Base Stats',
        value: `HP **${spirit.baseStats.hp}** • ATK **${spirit.baseStats.atk}**\n` +
               `DEF **${spirit.baseStats.def}** • SPD **${spirit.baseStats.spd}**`
      },
      { name: 'Power Score', value: `**${powerScore(spirit.baseStats).toFixed(1)}**`, inline: true },
      { name: 'Spirit ID',   value: `\`${userSpirit.shortId}\``,                     inline: true },
      { name: 'Mana Left',   value: `**${fmt(user.mana)}**`,                          inline: true }
    )
    .setFooter({ text: `Summon #${fmt(user.summonCount)} • ${spirit.slug}` });

  return embed;
}

// ── Quick-action button row ───────────────────────────────────────────────────
function summonButtonRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`summon_again_${userId}`)
      .setLabel('✨ Summon Again')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`summon_toggle_${userId}`)
      .setLabel('🔕 Hide Button')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ── Handle "Summon Again" button (called from interactionCreate) ──────────────
async function handleSummonButton(interaction) {
  if (!interaction.customId.startsWith('summon_again_') &&
      !interaction.customId.startsWith('summon_toggle_')) return false;

  const parts  = interaction.customId.split('_');
  const action = parts[1];         // 'again' or 'toggle'
  const userId = parts[parts.length - 1];

  // Only the original summoner can use these buttons
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Only the summoner can use this button.', ephemeral: true });
    return true;
  }

  // ── Toggle button off ─────────────────────────────────────────────────────
  if (action === 'toggle') {
    const user = await getOrCreateUser(userId);
    user.buttonPrefs.summonButton = false;
    await user.save();
    await interaction.update({ components: [] });
    await interaction.followUp({ content: '🔕 Summon button hidden. Use `c buttons summon on` to re-enable.', ephemeral: true });
    return true;
  }

  // ── Summon again ──────────────────────────────────────────────────────────
  await interaction.deferReply();

  const cooldown = checkCooldown(userId, 'summon', ECONOMY.summonCooldownSeconds);
  if (!cooldown.ok) {
    await interaction.editReply(`⏳ Summon cooldown: **${formatCooldown(cooldown.remainingMs)}**`);
    return true;
  }

  const result = await summon(userId);
  if (!result.ok) {
    await interaction.editReply(result.reason);
    return true;
  }

  const { spirit, userSpirit, user } = result;

  // Award player XP
  const xpResult = awardPlayerXp(user, 'summon');
  if (xpResult.granted) await user.save();

  const embed    = buildSummonEmbed(spirit, userSpirit, user);
  const artwork  = findSpiritArtwork(spirit.slug);

  const showButton = user.buttonPrefs?.summonButton !== false;
  const components = showButton ? [summonButtonRow(userId)] : [];

  if (!artwork) {
    await interaction.editReply({ embeds: [embed], components });
    return true;
  }

  const attachment = new AttachmentBuilder(artwork.absolutePath, { name: artwork.fileName });
  embed.setImage(`attachment://${artwork.fileName}`);
  await interaction.editReply({ embeds: [embed], files: [attachment], components });
  return true;
}

// ── Main command ──────────────────────────────────────────────────────────────
module.exports = {
  name: 's',
  aliases: ['summon'],
  description: 'Summon a random spirit. Costs 2 Mana.',

  // Slash command data (registered separately)
  slashData: {
    name:        'summon',
    description: 'Summon a random spirit. Costs 2 Mana.',
  },

  async execute({ message, args }) {
    const userId   = message.author.id;
    const cooldown = checkCooldown(userId, 'summon', ECONOMY.summonCooldownSeconds);
    if (!cooldown.ok) return message.reply(`⏳ Summon cooldown: **${formatCooldown(cooldown.remainingMs)}**`);

    const result = await summon(userId);
    if (!result.ok) return message.reply(result.reason);

    const { spirit, userSpirit, user } = result;

    // Award player XP — INSIDE the function, correctly placed
    const xpResult = awardPlayerXp(user, 'summon');
    if (xpResult.granted) await user.save();

    const embed   = buildSummonEmbed(spirit, userSpirit, user);
    const artwork = findSpiritArtwork(spirit.slug);

    const showButton = user.buttonPrefs?.summonButton !== false;
    const components = showButton ? [summonButtonRow(userId)] : [];

    if (!artwork) {
      return message.reply({ embeds: [embed], components });
    }

    const attachment = new AttachmentBuilder(artwork.absolutePath, { name: artwork.fileName });
    embed.setImage(`attachment://${artwork.fileName}`);
    return message.reply({ embeds: [embed], files: [attachment], components });
  },

  // Export button handler so index.js can import it
  handleSummonButton,
};
