const MessageActivity = require('../models/MessageActivity');
const env = require('../config/env');

// ── Config — edit these values to tune thresholds ────────────────────────────
//
// WEEKLY_ROLES: earn the role when weeklyCount hits the threshold.
//               Role is removed on Monday when the week resets.
//               Add as many tiers as you want.
//
// PERMANENT_MILESTONES: earn the role permanently when totalCount hits the value.
//                       Never removed. Player only gets it once.
//
// All role IDs come from .env so you never hardcode them.
// Add to .env:
//   ACTIVITY_WEEKLY_ROLE_IDS=roleId1,roleId2        (one per weekly tier, comma-separated)
//   ACTIVITY_WEEKLY_THRESHOLDS=100,500              (matching counts)
//   ACTIVITY_PERM_ROLE_IDS=roleIdA,roleIdB          (one per permanent milestone)
//   ACTIVITY_PERM_THRESHOLDS=1000,5000              (matching total message counts)

function parseActivityConfig() {
  const weeklyRoleIds    = (process.env.ACTIVITY_WEEKLY_ROLE_IDS   || '').split(',').map(s => s.trim()).filter(Boolean);
  const weeklyThresholds = (process.env.ACTIVITY_WEEKLY_THRESHOLDS || '').split(',').map(Number).filter(Boolean);
  const permRoleIds      = (process.env.ACTIVITY_PERM_ROLE_IDS     || '').split(',').map(s => s.trim()).filter(Boolean);
  const permThresholds   = (process.env.ACTIVITY_PERM_THRESHOLDS   || '').split(',').map(Number).filter(Boolean);

  const weekly = weeklyRoleIds.map((roleId, i) => ({
    roleId,
    threshold: weeklyThresholds[i] || 0
  })).filter(t => t.threshold > 0);

  const permanent = permRoleIds.map((roleId, i) => ({
    roleId,
    threshold: permThresholds[i] || 0,
    key: `milestone_${permThresholds[i] || i}`
  })).filter(t => t.threshold > 0);

  return { weekly, permanent };
}

// ── Week start helper ─────────────────────────────────────────────────────────
function currentWeekStart() {
  const now  = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

// ── Check if a channel should be counted ─────────────────────────────────────
// Only counts messages in configured chat channels, not bot command channels.
function isCountableChannel(channelId) {
  const allowed = (process.env.ACTIVITY_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.length) return true; // if not configured, count all channels
  return allowed.includes(channelId);
}

// ── Record a message ─────────────────────────────────────────────────────────
async function recordMessage(client, message) {
  const officialGuildId = env.officialGuildId;
  if (!officialGuildId) return;
  if (!message.guild || message.guild.id !== officialGuildId) return;
  if (message.author.bot) return;
  if (!isCountableChannel(message.channel.id)) return;

  // Skip bot command messages (starts with any known prefix)
  const prefix = process.env.DEFAULT_PREFIX || 'c';
  if (message.content.trim().toLowerCase().startsWith(prefix.toLowerCase())) return;

  const weekStart = currentWeekStart();

  // Upsert activity record
  let activity = await MessageActivity.findOne({ userId: message.author.id });

  if (!activity) {
    activity = new MessageActivity({ userId: message.author.id, weekStart });
  }

  // If a new week has started since last message, reset weekly count
  if (activity.weekStart.getTime() < weekStart.getTime()) {
    activity.weeklyCount = 0;
    activity.weekStart   = weekStart;
  }

  activity.weeklyCount += 1;
  activity.totalCount  += 1;
  await activity.save();

  // Check role assignments (fire-and-forget, never throws to caller)
  assignRolesIfEarned(client, message.guild, message.author.id, activity).catch(() => null);
}

// ── Assign roles if thresholds are met ───────────────────────────────────────
async function assignRolesIfEarned(client, guild, userId, activity) {
  const { weekly, permanent } = parseActivityConfig();
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  // Weekly roles — assign highest tier earned, remove lower tiers
  const earnedWeekly = weekly.filter(t => activity.weeklyCount >= t.threshold);
  const topWeekly    = earnedWeekly[earnedWeekly.length - 1]; // highest threshold earned

  for (const tier of weekly) {
    const hasRole = member.roles.cache.has(tier.roleId);
    if (topWeekly && tier.roleId === topWeekly.roleId && !hasRole) {
      await member.roles.add(tier.roleId, 'Weekly activity milestone reached').catch(() => null);
    } else if ((!topWeekly || tier.roleId !== topWeekly.roleId) && hasRole) {
      await member.roles.remove(tier.roleId, 'Lower weekly tier superseded').catch(() => null);
    }
  }

  // Permanent milestone roles — assign once, never remove
  for (const milestone of permanent) {
    if (activity.totalCount >= milestone.threshold &&
        !activity.earnedMilestones.includes(milestone.key)) {
      await member.roles.add(milestone.roleId, `Total message milestone: ${milestone.threshold}`).catch(() => null);
      activity.earnedMilestones.push(milestone.key);
      await activity.save();
    }
  }
}

// ── Weekly reset — runs every Monday 00:00 UTC ────────────────────────────────
// Removes weekly roles from all members and resets their weekly counts.
async function runWeeklyReset(client) {
  const officialGuildId = env.officialGuildId;
  if (!officialGuildId) return;

  const { weekly } = parseActivityConfig();
  if (!weekly.length) return;

  console.log('[Activity] Running weekly reset...');

  const guild = await client.guilds.fetch(officialGuildId).catch(() => null);
  if (!guild) return;

  // Reset all weekly counts in DB
  const weekStart = currentWeekStart();
  await MessageActivity.updateMany(
    { weekStart: { $lt: weekStart } },
    { $set: { weeklyCount: 0, weekStart } }
  );

  // Remove all weekly roles from all members who have them
  for (const tier of weekly) {
    const role = guild.roles.cache.get(tier.roleId);
    if (!role) continue;

    const membersWithRole = role.members;
    for (const [, member] of membersWithRole) {
      await member.roles.remove(tier.roleId, 'Weekly activity reset').catch(() => null);
    }
  }

  console.log('[Activity] Weekly reset complete.');
}

// ── Schedule weekly reset ─────────────────────────────────────────────────────
function scheduleWeeklyReset(client) {
  function msUntilNextMonday() {
    const now    = new Date();
    const day    = now.getUTCDay();
    const diff   = day === 0 ? 1 : (8 - day) % 7 || 7;
    const next   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff, 0, 0, 0));
    return next.getTime() - Date.now();
  }

  const ms = msUntilNextMonday();
  const h  = Math.round(ms / 3_600_000);
  console.log(`[Activity] Next weekly reset in ~${h}h`);

  setTimeout(() => {
    runWeeklyReset(client).catch(console.error);
    // After first reset, repeat every 7 days exactly
    setInterval(() => runWeeklyReset(client).catch(console.error), 7 * 24 * 60 * 60 * 1000);
  }, ms);
}

// ── Restore permanent milestone roles on restart ──────────────────────────────
// In case the bot restarted and someone earned a milestone but
// Discord removed the role during an outage.
async function restorePermanentRoles(client) {
  const officialGuildId = env.officialGuildId;
  if (!officialGuildId) return;

  const { permanent } = parseActivityConfig();
  if (!permanent.length) return;

  const guild = await client.guilds.fetch(officialGuildId).catch(() => null);
  if (!guild) return;

  const records = await MessageActivity.find({ earnedMilestones: { $exists: true, $ne: [] } });

  for (const record of records) {
    const member = await guild.members.fetch(record.userId).catch(() => null);
    if (!member) continue;

    for (const milestone of permanent) {
      if (record.earnedMilestones.includes(milestone.key) && !member.roles.cache.has(milestone.roleId)) {
        await member.roles.add(milestone.roleId, 'Restoring permanent milestone role').catch(() => null);
      }
    }
  }

  console.log(`[Activity] Permanent milestone roles restored for ${records.length} user(s).`);
}

module.exports = { recordMessage, scheduleWeeklyReset, restorePermanentRoles };
