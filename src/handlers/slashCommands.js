const { REST, Routes, SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } = require('discord.js');
const env = require('../config/env');

// DM FIX: setDMPermission() is deprecated in discord.js v14.14+.
// Using setIntegrationTypes + setContexts is the correct modern approach.
// GuildInstall (0) = works in servers, UserInstall (1) = works everywhere including DMs.
// Contexts: Guild (0) = server channels, BotDM (1) = DMs with the bot, PrivateChannel (2) = group DMs.
const DM_CONTEXTS = [
  InteractionContextType.Guild,
  InteractionContextType.BotDM,
  InteractionContextType.PrivateChannel,
];
const INSTALL_TYPES = [
  ApplicationIntegrationType.GuildInstall,
  ApplicationIntegrationType.UserInstall,
];

const slashCommands = [
  new SlashCommandBuilder()
    .setName('summon').setDescription('Summon a random spirit. Costs 2 Mana.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS),

  new SlashCommandBuilder()
    .setName('battle').setDescription('Battle a random opponent with your team.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS),

  new SlashCommandBuilder()
    .setName('daily').setDescription('Claim your daily Mana reward.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS),

  new SlashCommandBuilder()
    .setName('profile').setDescription('View your Celestia profile.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addUserOption(o => o.setName('user').setDescription('View another player\'s profile').setRequired(false)),

  new SlashCommandBuilder()
    .setName('rank').setDescription('View your player level and XP.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addUserOption(o => o.setName('user').setDescription('View another player\'s rank').setRequired(false)),

  new SlashCommandBuilder()
    .setName('sanctuary').setDescription('Full player overview.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addUserOption(o => o.setName('user').setDescription('View another player\'s sanctuary').setRequired(false)),

  new SlashCommandBuilder()
    .setName('team').setDescription('View your battle team.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS),

  new SlashCommandBuilder()
    .setName('collection').setDescription('Browse your spirit collection.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('filter').setDescription('Filter: flame, legendary, etc.').setRequired(false)),

  new SlashCommandBuilder()
    .setName('bond').setDescription('View spirit bond progress.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('spiritid').setDescription('Spirit ID').setRequired(false)),

  new SlashCommandBuilder()
    .setName('constellation').setDescription('View constellation map.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('type').setDescription('Element type').setRequired(false)),

  new SlashCommandBuilder()
    .setName('vote').setDescription('Vote for Celestia on top.gg and earn Mana.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS),

  new SlashCommandBuilder()
    .setName('help').setDescription('View all commands.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('command').setDescription('Get help on a specific command').setRequired(false)),

  new SlashCommandBuilder()
    .setName('shop').setDescription('View the Mana shop.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS),

  new SlashCommandBuilder()
    .setName('sell').setDescription('Sell spirits.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('target').setDescription('Spirit ID, rarity, or duplicates').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lb').setDescription('Global leaderboard.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('type').setDescription('mana/wins/summons/streak/spirits').setRequired(false)),

  new SlashCommandBuilder()
    .setName('stardust').setDescription('Check Stardust or convert to spirit XP.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('spiritid').setDescription('Spirit ID to give XP').setRequired(false))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of Stardust').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('translate').setDescription('Translate text to another language.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('language').setDescription('Target language').setRequired(true))
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true)),

  new SlashCommandBuilder()
    .setName('votelb').setDescription('Vote leaderboard.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('type').setDescription('total or monthly').setRequired(false)),

  new SlashCommandBuilder()
    .setName('buttons').setDescription('Toggle quick-action buttons.')
    .setIntegrationTypes(INSTALL_TYPES).setContexts(DM_CONTEXTS)
    .addStringOption(o => o.setName('target').setDescription('summon / battle / all').setRequired(false))
    .addStringOption(o => o.setName('state').setDescription('on or off').setRequired(false)),
];

async function registerSlashCommands() {
  // Issue #22: TOPGG_BOT_ID is used as bot Application ID — must match your Discord App's Application ID
  const clientId = env.topggBotId;

  if (!clientId) {
    console.warn('[Slash] TOPGG_BOT_ID not set in .env — slash commands not registered.');
    console.warn('[Slash] Set TOPGG_BOT_ID to your bot\'s Application ID from discord.com/developers/applications');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(env.token);

  try {
    console.log('[Slash] Registering slash commands globally...');
    await rest.put(Routes.applicationCommands(clientId), {
      body: slashCommands.map(c => c.toJSON()),
    });
    console.log(`[Slash] ✅ Registered ${slashCommands.length} slash commands.`);
    console.log('[Slash] Note: Global slash commands can take up to 1 hour to appear in Discord.');
  } catch (err) {
    console.error('[Slash] Registration failed:', err.message);
    if (err.status === 401) console.error('[Slash] → Invalid DISCORD_TOKEN or TOPGG_BOT_ID');
    if (err.status === 403) console.error('[Slash] → Bot missing applications.commands scope — re-invite with correct permissions');
  }
}

module.exports = { registerSlashCommands, slashCommands };
