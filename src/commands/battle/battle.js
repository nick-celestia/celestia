const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { runBattle }                    = require('../../services/battleService');
const { checkCooldown, formatCooldown } = require('../../services/cooldownService');
const { ECONOMY }                      = require('../../config/game');
const { mentionToId }                  = require('../../utils/args');
const { fmt }                          = require('../../utils/format');
const { getOrCreateUser }              = require('../../services/userService');
const { awardPlayerXp }               = require('../../services/playerLevelService');

// ── Parse level cap ───────────────────────────────────────────────────────────
function parseLevelCap(args) {
  const match = args.join(' ').match(/(?:lvl|lv|level)(\d+)/i);
  if (!match) return null;
  const cap = parseInt(match[1]);
  return cap >= 1 && cap <= 100 ? cap : null;
}

// ── Build battle embed ────────────────────────────────────────────────────────
function buildBattleEmbed(result, authorMention, opponentText, prefix, isFriendly, levelCap) {
  const roundLines = result.rounds.map(r => {
    const lines = r.attacks.map(a => {
      const atkName = a.attacker.shortId === 'GHOST' ? '👻 ???'
        : `${a.attacker.spirit.emoji} ${a.attacker.spirit.name}${levelCap ? ` *(Lv.${a.attacker._simLevel || a.attacker.level})*` : ''}`;
      const defName = a.defender.shortId === 'GHOST' ? '👻 ???'
        : `${a.defender.spirit.emoji} ${a.defender.spirit.name}${levelCap ? ` *(Lv.${a.defender._simLevel || a.defender.level})*` : ''}`;
      const typeTag = a.matchup.advantaged
        ? ` *(${a.matchup.attackerType}→${a.matchup.defenderType} ${a.matchup.effectName})*` : '';
      const wpnTag  = a.weaponLog ? ` [${a.weaponLog}]` : '';
      const side    = a.side === 'A' ? '🔵' : '🔴';
      return `${side} ${atkName} **→** ${defName} · **${a.power.toFixed(1)}**${typeTag}${wpnTag}`;
    });
    return `**Round ${r.round}**\n${lines.join('\n')}`;
  }).join('\n\n');

  let outcomeText, color;
  if (result.isTie) {
    outcomeText = `⚖️ **It's a Draw!**`;
    color = 0xAAAAAA;
  } else {
    const winnerId = result.attackerWins ? result.attacker.userId : result.defender.userId;
    outcomeText = `🏆 **Winner: <@${winnerId}>**`;
    color = result.attackerWins ? 0x7B68EE : 0xFF4444;
  }

  const rewardsText = isFriendly
    ? '🤝 Friendly battle — no XP, bond, or streak changes'
    : result.isTie
      ? `XP: Both +${result.xpA} · Bond: +${result.bondGain} pts`
      : `XP: Winner +${result.xpA}, Loser +${result.xpB} · Bond: +${result.bondGain} pts`;

  const milestoneText = (!isFriendly && result.milestoneReward)
    ? `\n🎉 Streak milestone: **${fmt(result.milestoneReward)} Mana**` : '';
  const streakText    = (!isFriendly && !result.isTie)
    ? `\nStreak: **${fmt(result.attackerWins ? result.attacker.battleStreak : result.defender.battleStreak)}**` : '';
  const simNote       = levelCap ? `\n*All spirits simulated at Lv.${levelCap} cap*` : '';
  const titleText     = isFriendly
    ? `🤝 Friendly Battle${levelCap ? ` (Lv.${levelCap} cap)` : ''}`
    : '⚔️ Celestia Battle';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(titleText)
    .setDescription(`🔵 ${authorMention} vs 🔴 ${opponentText}${simNote}`)
    .addFields(
      { name: '📋 Battle Log', value: roundLines || 'No rounds recorded.' },
      { name: '📊 Score',  value: `🔵 **${result.scoreA.toFixed(1)}** — **${result.scoreB.toFixed(1)}** 🔴`, inline: true },
      { name: '🏆 Outcome', value: outcomeText + streakText + milestoneText },
      { name: '⚡ Rewards', value: rewardsText }
    )
    .setFooter({ text: `Random targeting • ${prefix || 'c'}mechanics for type chart` })
    .setTimestamp();
}

// ── Quick-action button row ───────────────────────────────────────────────────
function battleButtonRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`battle_again_${userId}`)
      .setLabel('⚔️ Battle Again')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`battle_toggle_${userId}`)
      .setLabel('🔕 Hide Button')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ── Handle "Battle Again" button (called from interactionCreate) ──────────────
async function handleBattleButton(interaction) {
  if (!interaction.customId.startsWith('battle_again_') &&
      !interaction.customId.startsWith('battle_toggle_')) return false;

  const parts  = interaction.customId.split('_');
  const action = parts[1];   // 'again' or 'toggle'
  const userId = parts[parts.length - 1];

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Only the original battler can use this button.', ephemeral: true });
    return true;
  }

  // ── Toggle off ────────────────────────────────────────────────────────────
  if (action === 'toggle') {
    const user = await getOrCreateUser(userId);
    user.buttonPrefs.battleButton = false;
    await user.save();
    await interaction.update({ components: [] });
    await interaction.followUp({ content: '🔕 Battle button hidden. Use `c buttons battle on` to re-enable.', ephemeral: true });
    return true;
  }

  // ── Battle again ──────────────────────────────────────────────────────────
  await interaction.deferReply();

  const cooldown = checkCooldown(userId, 'battle', ECONOMY.battleCooldownSeconds);
  if (!cooldown.ok) {
    await interaction.editReply(`⏳ Battle cooldown: **${formatCooldown(cooldown.remainingMs)}**`);
    return true;
  }

  const result = await runBattle(userId, null, { friendly: false, levelCap: null });
  if (!result.ok) {
    await interaction.editReply(result.reason);
    return true;
  }

  // Award account XP
  const xpResult = awardPlayerXp(result.attacker, 'battle');
  if (xpResult.granted) await result.attacker.save();

  const user = await getOrCreateUser(userId);
  const showButton = user.buttonPrefs?.battleButton !== false;
  const components = showButton ? [battleButtonRow(userId)] : [];

  const opponentText = result.defenderIsSnapshot
    ? `<@${result.defender.userId}> *(offline — stored team)*`
    : `<@${result.defender.userId}>`;

  const embed = buildBattleEmbed(result, `<@${userId}>`, opponentText, 'c ', false, null);
  await interaction.editReply({ embeds: [embed], components });
  return true;
}

// ── Main command ──────────────────────────────────────────────────────────────
module.exports = {
  name: 'b',
  aliases: ['battle'],
  description: 'Battle! Use c b @user for friendly, add lvl50 to cap spirit levels.',

  slashData: {
    name:        'battle',
    description: 'Battle a random opponent.',
  },

  async execute({ message, args, prefix }) {
    const userId   = message.author.id;
    const cooldown = checkCooldown(userId, 'battle', ECONOMY.battleCooldownSeconds);
    if (!cooldown.ok) return message.reply(`⏳ Battle cooldown: **${formatCooldown(cooldown.remainingMs)}**`);

    const targetId   = mentionToId(args[0]);
    if (targetId === userId) return message.reply('You cannot battle yourself.');

    const levelCap   = parseLevelCap(args);
    const isFriendly = Boolean(targetId);

    // ── Friendly battle — confirm/cancel ─────────────────────────────────────
    if (isFriendly) {
      const capText = levelCap ? ` at **Lv.${levelCap}** cap` : '';

      const confirmEmbed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🤝 Friendly Battle Request')
        .setDescription(
          `${message.author} is challenging <@${targetId}> to a friendly battle${capText}!\n\n` +
          `**No XP, bond, wins, losses, or streak changes** — just for fun.\n\n` +
          `<@${targetId}>, do you accept?`
        )
        .setFooter({ text: 'Expires in 60 seconds.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`fbattle_accept_${userId}_${targetId}_${levelCap || 0}`)
          .setLabel('✅ Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`fbattle_decline_${userId}_${targetId}`)
          .setLabel('❌ Decline')
          .setStyle(ButtonStyle.Danger),
      );

      const challenge = await message.reply({ embeds: [confirmEmbed], components: [row] });

      const collector = challenge.createMessageComponentCollector({
        filter: i => i.user.id === targetId,
        max:    1,
        time:   60_000
      });

      collector.on('collect', async interaction => {
        const parts  = interaction.customId.split('_');
        const action = parts[1];
        const cap    = parseInt(parts[4]) || null;

        if (action === 'decline') {
          await interaction.update({
            embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`❌ <@${targetId}> declined.`)],
            components: []
          });
          return;
        }

        await interaction.deferUpdate();
        const result = await runBattle(userId, targetId, { friendly: true, levelCap: cap });
        if (!result.ok) { await challenge.edit({ content: result.reason, embeds: [], components: [] }); return; }

        const embed = buildBattleEmbed(result, message.author.toString(), `<@${targetId}>`, prefix, true, cap);
        await challenge.edit({ embeds: [embed], components: [] });
      });

      collector.on('end', async (collected) => {
        if (!collected.size) {
          await challenge.edit({
            embeds: [new EmbedBuilder().setColor(0x888888).setDescription(`⏰ Battle request expired.`)],
            components: []
          }).catch(() => null);
        }
      });

      return;
    }

    // ── Random battle ─────────────────────────────────────────────────────────
    const result = await runBattle(userId, null, { friendly: false, levelCap: null });
    if (!result.ok) return message.reply(result.reason);

    // Award account XP
    const xpResult = awardPlayerXp(result.attacker, 'battle');
    if (xpResult.granted) await result.attacker.save();

    const user       = await getOrCreateUser(userId);
    const showButton = user.buttonPrefs?.battleButton !== false;
    const components = showButton ? [battleButtonRow(userId)] : [];

    const opponentText = result.defenderIsSnapshot
      ? `<@${result.defender.userId}> *(offline — stored team)*`
      : `<@${result.defender.userId}>`;

    const embed = buildBattleEmbed(result, message.author.toString(), opponentText, prefix, false, null);
    return message.reply({ embeds: [embed], components });
  },

  handleBattleButton,
};
