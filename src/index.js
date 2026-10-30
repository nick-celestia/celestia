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
const { handleSummonButton }     = require('./commands/summon/summon');
const { handleBattleButton }     = require('./commands/battle/battle');

const slashMap = {
  summon:'s', battle:'b', profile:'profile', daily:'daily', rank:'rank',
  team:'team', collection:'collection', sanctuary:'sanctuary', vote:'vote',
  help:'help', shop:'shop', stardust:'stardust', bond:'bond', lb:'lb',
  translate:'translate', votelb:'votelb', buttons:'buttons', sell:'sell',
  constellation:'constellation',  // ← was registered as slash but missing from map
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
    await registerSlashCommands().catch(console.error);

    function updateStatus() {
      const count = client.guilds.cache.size;
      client.user.setActivity(
        `Celestial Blessings in ${count} server${count === 1 ? '' : 's'} & counting...`,
        { type: ActivityType.Watching }
      );
    }
    updateStatus();
    setInterval(updateStatus, 30 * 60 * 1000);

    await checkExpiredGiveaways(client).catch(console.error);
    setInterval(() => checkExpiredGiveaways(client).catch(console.error), 30_000);
    await restoreVoterRoles(client).catch(console.error);
    await restorePermanentRoles(client).catch(console.error);
    scheduleWeeklyReset(client);
    startVoteAnnouncer(client);
    setInterval(cleanupXpSessions, 60 * 60 * 1000);
  });

  client.on('messageCreate', async (message) => {
    const handledAsDm = await handleDmMessage(client, message).catch(() => false);
    if (handledAsDm) return;
    recordMessage(client, message).catch(() => null);
    handleMessage(client, message);
  });

  client.on('interactionCreate', async (interaction) => {

    // ── Slash commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const prefixName = slashMap[interaction.commandName];
      if (!prefixName) return;

      const command = client.commands.get(prefixName)
        || client.commands.find(c => c.aliases?.includes(prefixName));
      if (!command) return;

      // Build args from slash options
      const args = [];
      try {
        const userOpt = interaction.options.getUser?.('user', false);
        if (userOpt) args.push(`<@${userOpt.id}>`);
        for (const opt of ['filter','spiritid','language','text','type','target','command']) {
          const val = interaction.options.getString?.(opt, false);
          if (val) args.push(val);
        }
        for (const opt of ['amount']) {
          const val = interaction.options.getInteger?.(opt, false);
          if (val !== null && val !== undefined) args.push(String(val));
        }
      } catch {}

      try {
        // Defer first so Discord doesn't show "thinking" forever
        await interaction.deferReply();

        // ── fakeMessage — gives slash interactions a message-like interface ──
        // channel is set from interaction so summon image attachment works
        const fakeMessage = {
          author:       interaction.user,
          guild:        interaction.guild,
          channel:      interaction.channel,   // ← critical: not null for slash
          member:       interaction.member,
          content:      '',
          _interaction: interaction,
          reply: async (payload) => {
            try {
              if (interaction.deferred || interaction.replied) {
                return interaction.editReply(payload);
              }
              return interaction.reply(payload);
            } catch (err) {
              console.error('[Slash reply error]', err.message);
            }
          },
          delete: async () => {},
        };

        // DM FIX: interaction.channel can be null in DMs even with Partials.Channel set.
        // createDM() fetches/creates the DM channel object so commands can use it.
        if (!fakeMessage.channel) {
          try { fakeMessage.channel = await interaction.user.createDM(); } catch {}
        }

        // Patch channel.send to use editReply for slash
        if (fakeMessage.channel) {
          const originalSend = fakeMessage.channel.send.bind(fakeMessage.channel);
          fakeMessage.channel = {
            ...fakeMessage.channel,
            send: async (payload) => {
              try {
                if (interaction.deferred || interaction.replied) {
                  return interaction.editReply(payload);
                }
                return interaction.reply(payload);
              } catch {
                return originalSend(payload);
              }
            }
          };
        }

        await command.execute({
          client,
          message:  fakeMessage,
          args,
          rawArgs:  args.join(' '),
          prefix:   '/',
          isOwner:     (id) => env.ownerIds.includes(id),
          isBotAdmin:  (id) => env.ownerIds.includes(id) || (env.botAdminIds || []).includes(id),
          isHelper:    (id) => env.ownerIds.includes(id) || (env.botAdminIds || []).includes(id) || (env.helperIds || []).includes(id),
        });
      } catch (err) {
        console.error('[Slash execute error]', err);
        const errMsg = { content: 'Something went wrong. Try the prefix command instead.', ephemeral: true };
        try {
          if (interaction.deferred || interaction.replied) await interaction.editReply(errMsg);
          else await interaction.reply(errMsg);
        } catch {}
      }
      return;
    }

    // ── Button interactions ─────────────────────────────────────────────────
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('summon_')) {
      await handleSummonButton(interaction).catch(console.error);
      return;
    }

    if (interaction.customId.startsWith('battle_again_') ||
        interaction.customId.startsWith('battle_toggle_')) {
      await handleBattleButton(interaction).catch(console.error);
      return;
    }

    if (interaction.customId.startsWith('fbattle_')) return;

    await handleGiveawayButton(interaction).catch(console.error);
  });

  startWebServer(client);
  await client.login(env.token);
}

main().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
