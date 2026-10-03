const VoteRecord   = require('../models/VoteRecord');
const { getOrCreateUser } = require('./userService');
const { logEvent } = require('./logService');
const env = require('../config/env');

const VOTE_REWARDS = {
  mana:         200,
  weekendBonus: 200,
};

// ── Assign voter role in the official server ──────────────────────────────────
async function assignVoterRole(client, userId) {
  const guildId = env.officialGuildId;
  const roleId  = env.voterRoleId;
  if (!guildId || !roleId) return; // not configured — skip silently

  try {
    const guild  = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return; // player not in official server — that's fine

    await member.roles.add(roleId, 'Voted for Celestia on top.gg');
  } catch (err) {
    console.error('[VoterRole] Failed to assign role:', err.message);
  }
}

// ── Remove voter role after 12 hours ─────────────────────────────────────────
async function removeVoterRole(client, userId) {
  const guildId = env.officialGuildId;
  const roleId  = env.voterRoleId;
  if (!guildId || !roleId) return;

  try {
    const guild  = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    await member.roles.remove(roleId, 'Vote expired (12h)');
  } catch (err) {
    console.error('[VoterRole] Failed to remove role:', err.message);
  }
}

// ── Record a vote ─────────────────────────────────────────────────────────────
async function recordVote(client, { userId, isWeekend = false }) {
  await VoteRecord.create({ userId, weekend: isWeekend });

  const user       = await getOrCreateUser(userId);
  const manaEarned = VOTE_REWARDS.mana + (isWeekend ? VOTE_REWARDS.weekendBonus : 0);
  user.mana += manaEarned;
  await user.save();

  await logEvent(client, {
    type:    'vote',
    userId,
    guildId: null,
    message: `User voted on top.gg. Earned ${manaEarned} Mana.${isWeekend ? ' (weekend bonus)' : ''}`,
    data:    { manaEarned, isWeekend }
  });

  // Assign voter role immediately, remove after 12h
  await assignVoterRole(client, userId);
  setTimeout(() => removeVoterRole(client, userId), 12 * 60 * 60 * 1000);

  // DM the player
  try {
    const discordUser = await client.users.fetch(userId);
    const weekendLine = isWeekend
      ? '\n🎉 **Weekend bonus!** You earned double Mana for voting today!'
      : '';
    await discordUser.send(
      `⭐ **Thank you for voting for Celestia on top.gg!**\n\n` +
      `You received **${manaEarned} Mana** as a reward.${weekendLine}\n\n` +
      `✨ You also received the **Celestia Voter** role in the official server (if you're a member).\n` +
      `The role expires in **12 hours** when your next vote becomes available.\n\n` +
      `🔗 https://top.gg/bot/${env.topggBotId}/vote`
    );
  } catch { /* DMs disabled — reward still given */ }

  return { manaEarned };
}
const { checkVoteCrate } = require('./weaponService');
const totalVotes = await VoteRecord.countDocuments({ userId });
const crateResult = await checkVoteCrate(client, userId, totalVotes);
if (crateResult?.ok) {
  // Add to DM message
  const wpnDef = require('../config/weapons').WEAPONS[crateResult.weapon.weaponId];
  dmLines.push(`\n⚔️ **Vote Crate!** You received ${wpnDef?.emoji} **${wpnDef?.name}** \`${crateResult.shortId}\` (${(crateResult.rolledStat*100).toFixed(1)}%)`);
}

// ── Restore voter roles on bot restart ───────────────────────────────────────
// Anyone who voted in the last 12h should still have the role.
// Call this once in client.once('ready').
async function restoreVoterRoles(client) {
  const roleId  = env.voterRoleId;
  const guildId = env.officialGuildId;
  if (!roleId || !guildId) return;

  const since = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const recent = await VoteRecord.find({ votedAt: { $gte: since } });

  for (const record of recent) {
    const msLeft = record.votedAt.getTime() + 12 * 60 * 60 * 1000 - Date.now();
    if (msLeft <= 0) continue;

    await assignVoterRole(client, record.userId);
    setTimeout(() => removeVoterRole(client, record.userId), msLeft);
  }

  console.log(`[VoterRole] Restored roles for ${recent.length} recent voter(s).`);
}

// ── Leaderboard helpers ───────────────────────────────────────────────────────
function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function getVoteLeaderboard(type = 'total', limit = 10) {
  const match = type === 'monthly' ? { votedAt: { $gte: monthStart() } } : {};
  return VoteRecord.aggregate([
    { $match: match },
    { $group: { _id: '$userId', votes: { $sum: 1 } } },
    { $sort: { votes: -1 } },
    { $limit: limit }
  ]);
}

async function getUserVoteCounts(userId) {
  const [total, monthly] = await Promise.all([
    VoteRecord.countDocuments({ userId }),
    VoteRecord.countDocuments({ userId, votedAt: { $gte: monthStart() } })
  ]);
  return { total, monthly };
}

module.exports = {
  recordVote, restoreVoterRoles,
  getVoteLeaderboard, getUserVoteCounts, monthStart
};
