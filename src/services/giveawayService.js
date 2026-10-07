const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway            = require('../models/Giveaway');
const { getOrCreateUser } = require('./userService');

// Giveaway reward parser — detects Mana amounts in prize text
// "500 Mana" → awards 500 Mana to winners automatically
// "Lucky Star item" → DMs winner to claim from staff (no auto-grant)
function parseManaReward(prize) {
  const match = prize.match(/(\d+)\s*mana/i);
  return match ? parseInt(match[1]) : null;
}

function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function buildActiveEmbed(giveaway) {
  return new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('🎉 Giveaway!')
    .setDescription(`**Prize:** ${giveaway.prize}`)
    .addFields(
      { name: 'Ends in',  value: timeLeft(giveaway.endsAt),          inline: true },
      { name: 'Winners',  value: `${giveaway.winnerCount}`,          inline: true },
      { name: 'Joined',   value: `${giveaway.participants.length}`,  inline: true }
    )
    .setFooter({ text: `Click Join to enter • Hosted by ${giveaway.hostedByTag || 'Celestia'}` })
    .setTimestamp(new Date(giveaway.endsAt));
}

function buildEndedEmbed(giveaway) {
  const winnerMentions = giveaway.winners.length
    ? giveaway.winners.map(id => `<@${id}>`).join(', ')
    : 'No valid participants.';

  return new EmbedBuilder()
    .setColor(0x95A5A6)
    .setTitle('🎊 Giveaway Ended')
    .setDescription(`**Prize:** ${giveaway.prize}`)
    .addFields(
      { name: '🏆 Winner(s)',   value: winnerMentions,                     inline: false },
      { name: 'Total entries', value: `${giveaway.participants.length}`,  inline: true }
    )
    .setFooter({ text: `Hosted by ${giveaway.hostedByTag || 'Celestia'}` })
    .setTimestamp();
}

function buildJoinButton(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_join')
      .setLabel('🎉 Join Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

function pickWinners(participants, count) {
  if (!participants.length) return [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── Issue #13: Auto-reward winners and DM them ────────────────────────────────
async function rewardWinners(client, giveaway) {
  const manaReward = parseManaReward(giveaway.prize);

  for (const winnerId of giveaway.winners) {
    try {
      const discordUser = await client.users.fetch(winnerId).catch(() => null);
      if (!discordUser) continue;

      // Auto-grant Mana if prize contains a Mana amount
      let rewardLine = '';
      if (manaReward) {
        const user    = await getOrCreateUser(winnerId);
        user.mana    += manaReward;
        await user.save();
        rewardLine = `\n\n✅ **${manaReward} Mana** has been added to your account automatically.`;
      } else {
        rewardLine = `\n\nPlease contact a staff member in the official server to claim your reward.`;
      }

      const dmEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🎊 You won a Celestia Giveaway!')
        .setDescription(`**Prize:** ${giveaway.prize}${rewardLine}`)
        .setFooter({ text: 'Congratulations! 🎉' })
        .setTimestamp();

      await discordUser.send({ embeds: [dmEmbed] }).catch(() => null);
    } catch { /* ignore DM failures */ }
  }
}

async function endGiveaway(client, giveaway) {
  if (giveaway.ended) return;

  const winners     = pickWinners(giveaway.participants, giveaway.winnerCount);
  giveaway.winners  = winners;
  giveaway.ended    = true;
  await giveaway.save();

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) {
      await message.edit({
        embeds:     [buildEndedEmbed(giveaway)],
        components: [buildJoinButton(true)]
      });
    }

    if (winners.length) {
      const mentions = winners.map(id => `<@${id}>`).join(', ');
      await channel.send(`🎊 Congratulations ${mentions}! You won **${giveaway.prize}**!`);
      // Auto-reward and DM winners
      await rewardWinners(client, giveaway);
    } else {
      await channel.send(`🎊 Giveaway for **${giveaway.prize}** ended — no one entered.`);
    }
  } catch (err) {
    console.error('[Giveaway] Error ending:', err);
  }
}

async function checkExpiredGiveaways(client) {
  const expired = await Giveaway.find({ ended: false, endsAt: { $lte: new Date() } });
  for (const giveaway of expired) await endGiveaway(client, giveaway);
}

async function handleGiveawayButton(interaction) {
  if (interaction.customId !== 'giveaway_join') return false;
  await interaction.deferReply({ ephemeral: true });

  const giveaway = await Giveaway.findOne({ messageId: interaction.message.id, ended: false });
  if (!giveaway) {
    await interaction.editReply({ content: '❌ This giveaway has already ended.' });
    return true;
  }

  const userId = interaction.user.id;
  if (giveaway.participants.includes(userId)) {
    giveaway.participants = giveaway.participants.filter(id => id !== userId);
    await giveaway.save();
    await interaction.message.edit({ embeds: [buildActiveEmbed(giveaway)], components: [buildJoinButton()] });
    await interaction.editReply({ content: '👋 You left the giveaway.' });
    return true;
  }

  giveaway.participants.push(userId);
  await giveaway.save();
  await interaction.message.edit({ embeds: [buildActiveEmbed(giveaway)], components: [buildJoinButton()] });
  await interaction.editReply({ content: `✅ You joined the **${giveaway.prize}** giveaway! 🍀` });
  return true;
}

module.exports = { buildActiveEmbed, buildEndedEmbed, buildJoinButton, endGiveaway, checkExpiredGiveaways, handleGiveawayButton };
