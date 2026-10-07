const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { summon }               = require('../../services/summonService');
const { checkCooldown, formatCooldown } = require('../../services/cooldownService');
const { ECONOMY }              = require('../../config/game');
const { battlePowerScore, battleStats } = require('../../utils/stats');
const { fmt }                  = require('../../utils/format');
const { findSpiritArtwork }    = require('../../utils/spiritArtwork');
const { awardPlayerXp }        = require('../../services/playerLevelService');
const { getOrCreateUser }      = require('../../services/userService');

const RARITY_COLORS = {
  Common:0xBFC5CE,Uncommon:0x43B581,Rare:0x3498DB,Epic:0x9B59B6,
  Custom:0x19D3C5,Legendary:0xF1C40F,Mythic:0xE84393,Celestial:0xD8F4FF,Ascended:0xFFFFFF
};

function quickPower(spirit) {
  const stats = battleStats(spirit.baseStats, 1);
  return battlePowerScore(stats, { weights: { hp:0.2, atk:2, def:1.4, spd:1.2 } });
}

// ── Build summon embed ────────────────────────────────────────────────────────
function buildSummonEmbed(spirit, userSpirit, user) {
  // Issue #15: use Discord timestamp for cooldown display
  const nextSummon = Math.floor((Date.now() + (ECONOMY.summonCooldownSeconds * 1000)) / 1000);

  return new EmbedBuilder()
    .setColor(RARITY_COLORS[spirit.tier] || 0x8E9AAF)
    .setTitle('✨ A spirit answered your call!')
    .setDescription(`${spirit.emoji} **${spirit.name}**\n**${spirit.tier}** · **${spirit.types.join(' / ')}**`)
    .addFields(
      { name: 'Stats',        value: `HP **${spirit.baseStats.hp}** · ATK **${spirit.baseStats.atk}** · DEF **${spirit.baseStats.def}** · SPD **${spirit.baseStats.spd}**` },
      { name: 'Power Score',  value: `**${quickPower(spirit).toFixed(1)}**`,  inline: true },
      { name: 'Spirit ID',    value: `\`${userSpirit.shortId}\``,             inline: true },
      { name: 'Mana Left',    value: `**${fmt(user.mana)}**`,                 inline: true },
      // Issue #20: summon count removed from here
    )
    // Issue #15: timestamp shows when next summon is available
    .setFooter({ text: `Next summon available` })
    .setTimestamp(new Date(nextSummon * 1000));
}

function summonButtonRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`summon_again_${userId}`).setLabel('✨ Summon Again').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`summon_toggle_${userId}`).setLabel('🔕 Hide').setStyle(ButtonStyle.Secondary),
  );
}

// ── Issue #2: Fixed image attachment path resolution ─────────────────────────
async function sendSummonResult(channel, spirit, userSpirit, user, userId) {
  const embed      = buildSummonEmbed(spirit, userSpirit, user);
  const showButton = user.buttonPrefs?.summonButton !== false;
  const components = showButton ? [summonButtonRow(userId)] : [];

  const artwork = findSpiritArtwork(spirit.slug);

  if (artwork) {
    try {
      const attachment = new AttachmentBuilder(artwork.absolutePath, { name: artwork.fileName });
      embed.setImage(`attachment://${artwork.fileName}`);
      return channel.send({ embeds: [embed], files: [attachment], components });
    } catch (err) {
      console.error('[Summon] Failed to attach artwork:', artwork.absolutePath, err.message);
      // Fall through to send without image
    }
  }

  return channel.send({ embeds: [embed], components });
}

async function handleSummonButton(interaction) {
  if (!interaction.customId.startsWith('summon_again_') && !interaction.customId.startsWith('summon_toggle_')) return false;

  const parts  = interaction.customId.split('_');
  const action = parts[1];
  const userId = parts[parts.length - 1];

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Only the summoner can use this button.', ephemeral: true });
    return true;
  }

  if (action === 'toggle') {
    const user = await getOrCreateUser(userId);
    user.buttonPrefs.summonButton = false;
    await user.save();
    await interaction.update({ components: [] });
    await interaction.followUp({ content: '🔕 Button hidden. Use `c buttons summon on` to re-enable.', ephemeral: true });
    return true;
  }

  await interaction.deferReply();
  const cooldown = checkCooldown(userId, 'summon', ECONOMY.summonCooldownSeconds);
  if (!cooldown.ok) { await interaction.editReply(`⏳ Summon cooldown: **${formatCooldown(cooldown.remainingMs)}**`); return true; }

  const result = await summon(userId);
  if (!result.ok) { await interaction.editReply(result.reason); return true; }

  const { spirit, userSpirit, user } = result;
  const xpResult = awardPlayerXp(user, 'summon');
  if (xpResult.granted) await user.save();

  const embed    = buildSummonEmbed(spirit, userSpirit, user);
  const artwork  = findSpiritArtwork(spirit.slug);
  const showBtn  = user.buttonPrefs?.summonButton !== false;
  const components = showBtn ? [summonButtonRow(userId)] : [];

  if (artwork) {
    try {
      const attachment = new AttachmentBuilder(artwork.absolutePath, { name: artwork.fileName });
      embed.setImage(`attachment://${artwork.fileName}`);
      await interaction.editReply({ embeds: [embed], files: [attachment], components });
      return true;
    } catch { /* fall through */ }
  }
  await interaction.editReply({ embeds: [embed], components });
  return true;
}

module.exports = {
  name: 's',
  aliases: ['summon'],
  description: 'Summon a random spirit. Costs 2 Mana.',

  async execute({ message, args }) {
    const userId   = message.author.id;
    const cooldown = checkCooldown(userId, 'summon', ECONOMY.summonCooldownSeconds);
    if (!cooldown.ok) return message.reply(`⏳ Summon cooldown: **${formatCooldown(cooldown.remainingMs)}**`);

    const result = await summon(userId);
    if (!result.ok) return message.reply(result.reason);

    const { spirit, userSpirit, user } = result;
    const xpResult = awardPlayerXp(user, 'summon');
    if (xpResult.granted) await user.save();

    return sendSummonResult(message.channel, spirit, userSpirit, user, userId);
  },

  handleSummonButton,
};
