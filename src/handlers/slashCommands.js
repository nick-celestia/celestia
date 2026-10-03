const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const env = require('../config/env');

// ── Slash command definitions ─────────────────────────────────────────────────
const slashCommands = [
  new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Summon a random spirit. Costs 2 Mana.'),

  new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Battle a random opponent with your team.'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your Celestia profile.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('View another player\'s profile').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily Mana reward.'),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your player level and XP progress.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('View another player\'s rank').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('team')
    .setDescription('View your battle team.'),

  new SlashCommandBuilder()
    .setName('collection')
    .setDescription('Browse your spirit collection.')
    .addStringOption(opt =>
      opt.setName('filter').setDescription('Filter by type or rarity (e.g. flame, legendary)').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('sanctuary')
    .setDescription('View your full player sanctuary.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('View another player\'s sanctuary').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote for Celestia on top.gg and earn Mana rewards.'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all Celestia commands.'),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the Celestia item shop.'),

  new SlashCommandBuilder()
    .setName('stardust')
    .setDescription('Check your Stardust balance or convert to spirit XP.')
    .addStringOption(opt =>
      opt.setName('spiritid').setDescription('Spirit ID to give XP to').setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Amount of Stardust to convert').setRequired(false).setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName('bond')
    .setDescription('View spirit bond progress.')
    .addStringOption(opt =>
      opt.setName('spiritid').setDescription('Spirit ID to check bond for').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('lb')
    .setDescription('View the global leaderboard.')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'Mana',       value: 'mana'       },
          { name: 'Wins',       value: 'wins'        },
          { name: 'Summons',    value: 'summons'     },
          { name: 'Streak',     value: 'streak'      },
          { name: 'Best Streak',value: 'beststreak'  },
          { name: 'Spirits',    value: 'spirits'     },
        )
    ),

  new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to another language.')
    .addStringOption(opt =>
      opt.setName('language').setDescription('Target language (e.g. hindi, spanish)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to translate').setRequired(true)
    ),
];

// ── Register slash commands globally ─────────────────────────────────────────
async function registerSlashCommands() {
  const rest  = new REST({ version: '10' }).setToken(env.token);
  const clientId = env.topggBotId;   // re-use the bot ID from env

  if (!clientId) {
    console.warn('[Slash] TOPGG_BOT_ID not set — skipping slash command registration.');
    return;
  }

  try {
    console.log('[Slash] Registering slash commands...');
    await rest.put(Routes.applicationCommands(clientId), {
      body: slashCommands.map(cmd => cmd.toJSON()),
    });
    console.log(`[Slash] Registered ${slashCommands.length} slash commands globally.`);
  } catch (err) {
    console.error('[Slash] Registration failed:', err);
  }
}

module.exports = { registerSlashCommands, slashCommands };
