const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../models/Giveaway');

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      { name: 'Ends in',  value: timeLeft(giveaway.endsAt), inline: true },
      { name: 'Winners',  value: `${giveaway.winnerCount}`, inline: true },
      { name: 'Joined',   value: `${giveaway.participants.length}`, inline: true }
    )
    .setFooter({ text: `Click the button below to enter • Hosted by ${giveaway.hostedByTag || 'Celestia'}` })
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
      { name: '🏆 Winner(s)', value: winnerMentions,              inline: false },
      { name: 'Total entries', value: `${giveaway.participants.length}`, inline: true }
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

// ── Pick random winners ───────────────────────────────────────────────────────

function pickWinners(participants, count) {
  if (!participants.length) return [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── End a giveaway ────────────────────────────────────────────────────────────

async function endGiveaway(client, giveaway) {
  if (giveaway.ended) return;

  const winners = pickWinners(giveaway.participants, giveaway.winnerCount);
  giveaway.winners = winners;
  giveaway.ended   = true;
  await giveaway.save();

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) {
      await message.edit({
        embeds: [buildEndedEmbed(giveaway)],
        components: [buildJoinButton(true)]   // disabled button
      });
    }

    // Announce winners in the same channel
    if (winners.length) {
      const mentions = winners.map(id => `<@${id}>`).join(', ');
      await channel.send(`🎊 Congratulations ${mentions}! You won **${giveaway.prize}**!`);
    } else {
      await channel.send(`🎊 Giveaway for **${giveaway.prize}** ended — no one entered.`);
    }
  } catch (err) {
    console.error('[Giveaway] Error ending giveaway:', err);
  }
}

// ── Scheduled checker — call this on bot startup and every 30s ───────────────

async function checkExpiredGiveaways(client) {
  const expired = await Giveaway.find({
    ended: false,
    endsAt: { $lte: new Date() }
  });

  for (const giveaway of expired) {
    await endGiveaway(client, giveaway);
  }
}

// ── Button interaction handler — call from interactionCreate event ────────────

async function handleGiveawayButton(interaction) {
  if (interaction.customId !== 'giveaway_join') return false;
  await interaction.deferReply({ ephemeral: true });

  const giveaway = await Giveaway.findOne({
    messageId: interaction.message.id,
    ended: false
  });

  if (!giveaway) {
    await interaction.editReply({ content: '❌ This giveaway has already ended.' });
    return true;
  }

  const userId = interaction.user.id;

  if (giveaway.participants.includes(userId)) {
    // Toggle: clicking again removes them
    giveaway.participants = giveaway.participants.filter(id => id !== userId);
    await giveaway.save();

    // Refresh the embed with new count
    await interaction.message.edit({
      embeds: [buildActiveEmbed(giveaway)],
      components: [buildJoinButton()]
    });

    await interaction.editReply({ content: '👋 You left the giveaway.' });
    return true;
  }

  giveaway.participants.push(userId);
  await giveaway.save();

  // Refresh the embed with new count
  await interaction.message.edit({
    embeds: [buildActiveEmbed(giveaway)],
    components: [buildJoinButton()]
  });

  await interaction.editReply({ content: `✅ You joined the **${giveaway.prize}** giveaway! Good luck! 🍀` });
  return true;
}

module.exports = {
  buildActiveEmbed,
  buildEndedEmbed,
  buildJoinButton,
  endGiveaway,
  checkExpiredGiveaways,
  handleGiveawayButton
};
