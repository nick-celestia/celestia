const { EmbedBuilder } = require('discord.js');
const { getVoteLeaderboard, monthStart } = require('../services/voteService');
const GuildConfig = require('../models/GuildConfig');

const MEDALS = ['🥇', '🥈', '🥉'];

// ── Build the monthly leaderboard embed ───────────────────────────────────────
async function buildMonthlyEmbed(client, month) {
  const results = await getVoteLeaderboard('monthly', 10);

  if (!results.length) return null;

  const lines = await Promise.all(results.map(async (entry, idx) => {
    const medal = MEDALS[idx] || `**${idx + 1}.**`;
    let username = `<@${entry._id}>`;
    try {
      const u  = await client.users.fetch(entry._id);
      username = `**${u.username}**`;
    } catch { /* ignore */ }
    return `${medal} ${username} — ${entry.votes} vote${entry.votes === 1 ? '' : 's'}`;
  }));

  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`⭐ Monthly Vote Champions — ${month}`)
    .setDescription(lines.join('\n'))
    .addFields({
      name: '🎁 Reward',
      value: 'Top voters receive exclusive rewards from the Celestia team!\nStay tuned for announcements.',
      inline: false
    })
    .setFooter({ text: 'Vote every 12h at top.gg to appear here next month! • c vote' })
    .setTimestamp();
}

// ── Announce to all guilds that have a vote channel configured ────────────────
async function announceMonthlyLeaderboard(client, monthLabel) {
  const embed = await buildMonthlyEmbed(client, monthLabel);
  if (!embed) {
    console.log('[VoteAnnouncer] No votes this month — skipping announcement.');
    return;
  }

  const configs = await GuildConfig.find({ voteAnnouncementChannelId: { $ne: null } });
  let sent = 0;
  for (const config of configs) {
    try {
      const channel = await client.channels.fetch(config.voteAnnouncementChannelId);
      await channel.send({ embeds: [embed] });
      sent++;
    } catch (err) {
      console.error(`[VoteAnnouncer] Failed to send to guild ${config.guildId}:`, err.message);
    }
  }
  console.log(`[VoteAnnouncer] Monthly leaderboard sent to ${sent} server(s).`);
}

// ── Scheduler — call once on bot startup ──────────────────────────────────────
// Fires on the 1st of every month at 12:00 UTC.
function startVoteAnnouncer(client) {
  function scheduleNext() {
    const now   = new Date();
    const next  = new Date(Date.UTC(
      now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(),
      now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1,
      1, 12, 0, 0   // 1st of next month, 12:00 UTC
    ));
    const msUntil = next.getTime() - Date.now();
    const hoursUntil = Math.round(msUntil / 3600000);
    console.log(`[VoteAnnouncer] Next monthly announcement in ~${hoursUntil}h`);

    setTimeout(async () => {
      // monthLabel = the month that just ended
      const ended = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() - 1, 1));
      const label = ended.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      await announceMonthlyLeaderboard(client, label).catch(console.error);
      scheduleNext(); // schedule the next one
    }, msUntil);
  }

  scheduleNext();
}

// ── Manual trigger command (owner only) ───────────────────────────────────────
// c announcevoters  →  immediately posts the current monthly leaderboard
// Useful for testing without waiting until the 1st.
async function manualAnnounce(client, message) {
  const label = monthStart().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  await announceMonthlyLeaderboard(client, label);
  await message.reply(`✅ Monthly vote leaderboard announced to all configured channels.`);
}

module.exports = { startVoteAnnouncer, manualAnnounce, announceMonthlyLeaderboard };
