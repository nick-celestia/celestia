const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const env = require('../config/env');

const slashCommands = [
  new SlashCommandBuilder().setName('summon').setDescription('Summon a random spirit. Costs 2 Mana.'),
  new SlashCommandBuilder().setName('battle').setDescription('Battle a random opponent with your team.'),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily Mana reward.'),
  new SlashCommandBuilder().setName('profile').setDescription('View your Celestia profile.')
    .addUserOption(o => o.setName('user').setDescription('View another player\'s profile').setRequired(false)),
  new SlashCommandBuilder().setName('rank').setDescription('View your player level and XP.')
    .addUserOption(o => o.setName('user').setDescription('View another player\'s rank').setRequired(false)),
  new SlashCommandBuilder().setName('sanctuary').setDescription('Full player overview.')
    .addUserOption(o => o.setName('user').setDescription('View another player\'s sanctuary').setRequired(false)),
  new SlashCommandBuilder().setName('team').setDescription('View your battle team.'),
  new SlashCommandBuilder().setName('collection').setDescription('Browse your spirit collection.')
    .addStringOption(o => o.setName('filter').setDescription('Filter: flame, legendary, etc.').setRequired(false)),
  new SlashCommandBuilder().setName('bond').setDescription('View spirit bond progress.')
    .addStringOption(o => o.setName('spiritid').setDescription('Spirit ID').setRequired(false)),
  new SlashCommandBuilder().setName('constellation').setDescription('View constellation map.')
    .addStringOption(o => o.setName('type').setDescription('Element type').setRequired(false)),
  new SlashCommandBuilder().setName('vote').setDescription('Vote for Celestia on top.gg and earn Mana.'),
  new SlashCommandBuilder().setName('help').setDescription('View all commands.')
    .addStringOption(o => o.setName('command').setDescription('Get help on a specific command').setRequired(false)),
  new SlashCommandBuilder().setName('shop').setDescription('View the Mana shop.'),
  new SlashCommandBuilder().setName('sell').setDescription('Sell spirits.')
    .addStringOption(o => o.setName('target').setDescription('Spirit ID, rarity, or duplicates').setRequired(true)),
  new SlashCommandBuilder().setName('lb').setDescription('Global leaderboard.')
    .addStringOption(o => o.setName('type').setDescription('mana/wins/summons/streak/spirits').setRequired(false)),
  new SlashCommandBuilder().setName('stardust').setDescription('Check Stardust or convert to spirit XP.')
    .addStringOption(o => o.setName('spiritid').setDescription('Spirit ID to give XP').setRequired(false))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of Stardust').setRequired(false).setMinValue(1)),
  new SlashCommandBuilder().setName('translate').setDescription('Translate text to another language.')
    .addStringOption(o => o.setName('language').setDescription('Target language').setRequired(true))
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true)),
  new SlashCommandBuilder().setName('votelb').setDescription('Vote leaderboard.')
    .addStringOption(o => o.setName('type').setDescription('total or monthly').setRequired(false)),
  new SlashCommandBuilder().setName('buttons').setDescription('Toggle quick-action buttons.')
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
