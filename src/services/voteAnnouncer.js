const { EmbedBuilder } = require('discord.js');
const { getVoteLeaderboard, monthStart } = require('../services/voteService');
const GuildConfig = require('../models/GuildConfig');

const MEDALS = ['🥇', '🥈', '🥉'];

async function fetchName(client, userId) {
  try { return (await client.users.fetch(userId)).username; } catch { return userId; }
}

async function buildMonthlyEmbed(client, month) {
  const results = await getVoteLeaderboard('monthly', 10);
  if (!results.length) return null;

  const lines = await Promise.all(results.map(async (entry, idx) => {
    const medal    = MEDALS[idx] || `**${idx + 1}.**`;
    const username = await fetchName(client, entry._id);
    return `${medal} **${username}** — ${entry.votes} vote${entry.votes === 1 ? '' : 's'}`;
  }));

  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`⭐ Monthly Vote Champions — ${month}`)
    .setDescription(lines.join('\n'))
    .addFields({ name: '🎁 Reward', value: 'Top voters receive exclusive rewards from the Celestia team!', inline: false })
    .setFooter({ text: 'Vote every 12h at top.gg • c vote' })
    .setTimestamp();
}

async function announceMonthlyLeaderboard(client, monthLabel) {
  const embed = await buildMonthlyEmbed(client, monthLabel);
  if (!embed) { console.log('[VoteAnnouncer] No votes this month — skipping.'); return; }

  const configs = await GuildConfig.find({ voteAnnouncementChannelId: { $ne: null } });
  let sent = 0;
  for (const config of configs) {
    try {
      const channel = await client.channels.fetch(config.voteAnnouncementChannelId);
      await channel.send({ embeds: [embed] });
      sent++;
    } catch (err) {
      console.error(`[VoteAnnouncer] Failed guild ${config.guildId}:`, err.message);
    }
  }
  console.log(`[VoteAnnouncer] Sent to ${sent} server(s).`);
}

// ── Fix: setTimeout overflow ──────────────────────────────────────────────────
// Node.js setTimeout max is 2,147,483,647 ms (~24.8 days).
// Scheduling months ahead overflows. Use repeated 1-hour checks instead.
function startVoteAnnouncer(client) {
  let lastAnnouncedMonth = null;

  async function checkAndAnnounce() {
    const now       = new Date();
    // Announce on the 1st of each month at 12:00–13:00 UTC
    if (now.getUTCDate() !== 1) return;
    if (now.getUTCHours() < 12 || now.getUTCHours() >= 13) return;

    // Build a key like "2026-10" to avoid announcing twice in the same hour
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    if (lastAnnouncedMonth === monthKey) return;
    lastAnnouncedMonth = monthKey;

    // Label = the month that just ended
    const ended = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const label = ended.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    await announceMonthlyLeaderboard(client, label).catch(console.error);
  }

  // Run immediately on startup (in case bot restarted on the 1st)
  checkAndAnnounce().catch(console.error);

  // Then check every hour — no overflow possible since 3,600,000 ms is well within limits
  setInterval(() => checkAndAnnounce().catch(console.error), 60 * 60 * 1000);

  console.log('[VoteAnnouncer] Scheduler started — checks every hour.');
}

async function manualAnnounce(client, message) {
  const label = monthStart().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  await announceMonthlyLeaderboard(client, label);
  await message.reply('✅ Monthly vote leaderboard announced.');
}

module.exports = { startVoteAnnouncer, manualAnnounce, announceMonthlyLeaderboard };
