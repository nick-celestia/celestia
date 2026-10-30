const { REST, Routes, SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } = require('discord.js');
const env = require('../config/env');

// Guild-only: works only inside servers
const GUILD_ONLY = {
  integrationTypes: [ApplicationIntegrationType.GuildInstall],
  contexts:         [InteractionContextType.Guild],
};

// DM-enabled: works in servers AND in DMs with the bot
// Used ONLY for daily and profile as requested
const GUILD_AND_DM = {
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts:         [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
};

const slashCommands = [
  // ── Guild-only (no DM access) ─────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('summon').setDescription('Summon a random spirit. Costs 2 Mana.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts),

  new SlashCommandBuilder()
    .setName('battle').setDescription('Battle a random opponent with your team.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts),

  new SlashCommandBuilder()
    .setName('rank').setDescription('View your player level and XP.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addUserOption(o => o.setName('user').setDescription('View another player\'s rank').setRequired(false)),

  new SlashCommandBuilder()
    .setName('sanctuary').setDescription('Full player overview.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addUserOption(o => o.setName('user').setDescription('View another player\'s sanctuary').setRequired(false)),

  new SlashCommandBuilder()
    .setName('team').setDescription('View your battle team.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts),

  new SlashCommandBuilder()
    .setName('collection').setDescription('Browse your spirit collection.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('filter').setDescription('Filter: flame, legendary, etc.').setRequired(false)),

  new SlashCommandBuilder()
    .setName('bond').setDescription('View spirit bond progress.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('spiritid').setDescription('Spirit ID').setRequired(false)),

  new SlashCommandBuilder()
    .setName('constellation').setDescription('View constellation map.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('type').setDescription('Element type').setRequired(false)),

  new SlashCommandBuilder()
    .setName('vote').setDescription('Vote for Celestia on top.gg and earn Mana.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts),

  new SlashCommandBuilder()
    .setName('help').setDescription('View all commands.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('command').setDescription('Get help on a specific command').setRequired(false)),

  new SlashCommandBuilder()
    .setName('shop').setDescription('View the Mana shop.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts),

  new SlashCommandBuilder()
    .setName('sell').setDescription('Sell spirits for Stardust.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('target').setDescription('Spirit ID, rarity, or duplicates').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lb').setDescription('Global leaderboard.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('type').setDescription('mana/wins/summons/streak/spirits').setRequired(false)),

  new SlashCommandBuilder()
    .setName('stardust').setDescription('Check Stardust or convert to spirit XP.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('spiritid').setDescription('Spirit ID to give XP').setRequired(false))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of Stardust').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('translate').setDescription('Translate text to another language.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('language').setDescription('Target language').setRequired(true))
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true)),

  new SlashCommandBuilder()
    .setName('votelb').setDescription('Vote leaderboard.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('type').setDescription('total or monthly').setRequired(false)),

  new SlashCommandBuilder()
    .setName('buttons').setDescription('Toggle quick-action buttons.')
    .setIntegrationTypes(GUILD_ONLY.integrationTypes).setContexts(GUILD_ONLY.contexts)
    .addStringOption(o => o.setName('target').setDescription('summon / battle / all').setRequired(false))
    .addStringOption(o => o.setName('state').setDescription('on or off').setRequired(false)),

  // ── DM-enabled (guild + DM) ───────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('daily').setDescription('Claim your daily Mana reward.')
    .setIntegrationTypes(GUILD_AND_DM.integrationTypes).setContexts(GUILD_AND_DM.contexts),

  new SlashCommandBuilder()
    .setName('profile').setDescription('View your Celestia profile.')
    .setIntegrationTypes(GUILD_AND_DM.integrationTypes).setContexts(GUILD_AND_DM.contexts)
    .addUserOption(o => o.setName('user').setDescription('View another player\'s profile').setRequired(false)),
];

async function registerSlashCommands() {
  const clientId = env.topggBotId;
  if (!clientId) {
    console.warn('[Slash] TOPGG_BOT_ID not set — slash commands not registered.');
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
    if (err.status === 401) console.error('[Slash] → Invalid token or Application ID');
    if (err.status === 403) console.error('[Slash] → Bot missing applications.commands scope');
  }
}

module.exports = { registerSlashCommands, slashCommands };
