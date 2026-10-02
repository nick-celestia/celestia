require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const env = require('./config/env');
const { connectDatabase }        = require('./database');
const { loadCommands, handleMessage } = require('./handlers/commandHandler');
const { startWebServer }         = require('./web/server');
const { handleGiveawayButton, checkExpiredGiveaways } = require('./services/giveawayService');
const { handleDmMessage }        = require('./services/imageCaptchaService');
const { startVoteAnnouncer }     = require('./services/voteAnnouncer');
const { restoreVoterRoles }      = require('./services/voteService');
const { recordMessage, scheduleWeeklyReset, restorePermanentRoles } = require('./services/activityService');
const { cleanupXpSessions }      = require('./services/playerLevelService');
const { registerSlashCommands }  = require('./handlers/slashCommands');

// Import button handlers from commands
const { handleSummonButton } = require('./commands/summon/summon');
const { handleBattleButton } = require('./commands/battle/battle');

// Slash command executors — maps slash command name → prefix command handler
const slashMap = {
  summon:     's',
  battle:     'b',
  profile:    'profile',
  daily:      'daily',
  rank:       'rank',
  team:       'team',
  collection: 'collection',
  sanctuary:  'sanctuary',
  vote:       'vote',
  help:       'help',
  shop:       'shop',
  stardust:   'stardust',
  bond:       'bond',
  lb:         'lb',
  translate:  'translate',
};

async function main() {
  await connectDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  loadCommands(client);

  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Register slash commands
    await registerSlashCommands().catch(console.error);

    // Status
    function updateStatus() {
      const count = client.guilds.cache.size;
      client.user.setActivity(
        `Celestial Blessings in ${count} server${count === 1 ? '' : 's'} & counting...`,
        { type: ActivityType.Watching }
      );
    }
    updateStatus();
    setInterval(updateStatus, 30 * 60 * 1000);

    // Giveaway recovery
    await checkExpiredGiveaways(client).catch(console.error);
    setInterval(() => checkExpiredGiveaways(client).catch(console.error), 30_000);

    // Vote: restore voter roles
    await restoreVoterRoles(client).catch(console.error);

    // Activity: restore permanent milestone roles
    await restorePermanentRoles(client).catch(console.error);

    // Activity: weekly reset scheduler
    scheduleWeeklyReset(client);

    // Vote: monthly leaderboard auto-announcer
    startVoteAnnouncer(client);

    // XP session cleanup
    setInterval(cleanupXpSessions, 60 * 60 * 1000);
  });

  // ── Message handler ───────────────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    const handledAsDm = await handleDmMessage(client, message).catch(() => false);
    if (handledAsDm) return;

    recordMessage(client, message).catch(() => null);
    handleMessage(client, message);
  });

  // ── Interaction handler — buttons + slash commands ────────────────────────
  client.on('interactionCreate', async (interaction) => {

    // ── Slash commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const prefixName = slashMap[interaction.commandName];
      if (!prefixName) return;

      const command = client.commands.get(prefixName)
        || client.commands.find(c => c.aliases?.includes(prefixName));
      if (!command) return;

      // Build a fake message-like object for compatibility
      // Extract args from slash options
      const args = [];
      const userOpt = interaction.options.getUser('user', false);
      if (userOpt) args.push(`<@${userOpt.id}>`);

      const stringOpts = ['filter','spiritid','language','text','type'];
      for (const opt of stringOpts) {
        const val = interaction.options.getString(opt, false);
        if (val) args.push(val);
      }
      const intOpts = ['amount'];
      for (const opt of intOpts) {
        const val = interaction.options.getInteger(opt, false);
        if (val !== null) args.push(String(val));
      }

      try {
        await interaction.deferReply();

        // Wrap interaction to behave like message for existing execute functions
        const fakeMessage = {
          author:  interaction.user,
          guild:   interaction.guild,
          channel: interaction.channel,
          member:  interaction.member,
          reply:   async (payload) => {
            if (interaction.deferred) return interaction.editReply(payload);
            return interaction.reply(payload);
          },
          delete: async () => {},
          content: '',
        };

        await command.execute({
          client,
          message:  fakeMessage,
          args,
          rawArgs:  args.join(' '),
          prefix:   '/',
          isOwner:  (id) => env.ownerIds.includes(id),
          isBotAdmin: (id) => env.ownerIds.includes(id) || (env.botAdminIds || []).includes(id),
          isHelper: (id) => env.ownerIds.includes(id) || (env.botAdminIds || []).includes(id) || (env.helperIds || []).includes(id),
        });
      } catch (err) {
        console.error('[Slash]', err);
        const errReply = { content: 'Something went wrong with this slash command.', ephemeral: true };
        if (interaction.deferred) interaction.editReply(errReply).catch(() => null);
        else interaction.reply(errReply).catch(() => null);
      }
      return;
    }

    // ── Button interactions ─────────────────────────────────────────────────
    if (!interaction.isButton()) return;

    // Summon button
    if (interaction.customId.startsWith('summon_')) {
      await handleSummonButton(interaction).catch(console.error);
      return;
    }

    // Battle button (quick-action)
    if (interaction.customId.startsWith('battle_again_') ||
        interaction.customId.startsWith('battle_toggle_')) {
      await handleBattleButton(interaction).catch(console.error);
      return;
    }

    // Friendly battle confirm/decline
    if (interaction.customId.startsWith('fbattle_')) {
      // Handled inside battle.js collector — no action needed here
      return;
    }

    // Giveaway join
    await handleGiveawayButton(interaction).catch(console.error);
  });

  startWebServer(client);
  await client.login(env.token);
}

main().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
