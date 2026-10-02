const Log         = require('../models/Log');
const GuildConfig = require('../models/GuildConfig');

// ── Severity — controls what goes to Discord channel ─────────────────────────
// ALL events are ALWAYS saved to MongoDB permanently.
// Deletion only when a bot admin explicitly runs c deletelogs @user.
//
// CRITICAL  → sent to log channel immediately (bans, fraud)
// IMPORTANT → batched and sent every 60s max (captcha, abuse flags)
// INFO/DEBUG → DB only, never sent to channel (normal gameplay)

const LOG_LEVELS = {
  permanent_ban:                  'CRITICAL',
  auto_temp_ban_ignored_captcha:  'CRITICAL',
  manual_ban:                     'CRITICAL',
  manual_unban:                   'CRITICAL',
  exploit_suspected:              'CRITICAL',
  captcha_required:               'IMPORTANT',
  captcha_failed:                 'IMPORTANT',
  captcha_passed:                 'IMPORTANT',
  captcha_solved:                 'IMPORTANT',
  dm_captcha_sent:                'IMPORTANT',
  suspicious_activity:            'IMPORTANT',
  summon:                         'INFO',
  battle:                         'INFO',
  daily:                          'INFO',
  xp_gain:                        'INFO',
  level_up:                       'INFO',
  team_update:                    'INFO',
  command_used:                   'INFO',
  giveaway_join:                  'INFO',
  giveaway_end:                   'INFO',
  vote:                           'INFO',
  weapon_grant:                   'INFO',
  weapon_crate:                   'INFO',
  weapon_crush:                   'INFO',
  legal_acceptance:               'INFO',
};

function getLevelFor(type) {
  return LOG_LEVELS[type] || 'INFO';
}

// ── Batch buffer ──────────────────────────────────────────────────────────────
const BATCH_LIMIT    = 5;
const BATCH_DELAY_MS = 60_000;
const pendingBatches = new Map();

async function flushBatch(client, guildId, channelId) {
  const batch = pendingBatches.get(guildId);
  if (!batch?.lines.length) return;
  const lines = batch.lines.splice(0);
  clearTimeout(batch.timer);
  pendingBatches.delete(guildId);

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const text = lines.join('\n');
  for (let i = 0; i < text.length; i += 1900) {
    await channel.send(`🧾 **Log Batch**\n${text.slice(i, i + 1900)}`).catch(() => null);
  }
}

function queueBatch(client, guildId, channelId, line) {
  if (!pendingBatches.has(guildId)) pendingBatches.set(guildId, { lines: [], timer: null });
  const batch = pendingBatches.get(guildId);
  batch.lines.push(line);
  if (batch.lines.length >= BATCH_LIMIT) { flushBatch(client, guildId, channelId); return; }
  clearTimeout(batch.timer);
  batch.timer = setTimeout(() => flushBatch(client, guildId, channelId), BATCH_DELAY_MS);
}

// ── Core logEvent ─────────────────────────────────────────────────────────────
async function logEvent(client, { type, userId = null, guildId = null, message = '', data = {} }) {
  const log   = await Log.create({ type, userId, guildId, message, data });
  const level = getLevelFor(type);

  if (level === 'INFO' || level === 'DEBUG') return log;
  if (!client || !guildId) return log;

  const config = await GuildConfig.findOne({ guildId });
  if (!config?.logChannelId) return log;

  const ts   = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const user = userId ? `<@${userId}>` : '';
  const line = `\`${ts}\` **${type}** ${user} — ${message}`;

  if (level === 'CRITICAL') {
    const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (channel) await channel.send(`🚨 **CRITICAL** ${line}`).catch(() => null);
  } else {
    queueBatch(client, guildId, config.logChannelId, line);
  }

  return log;
}

module.exports = { logEvent };
