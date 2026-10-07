const { EmbedBuilder }  = require('discord.js');
const Log               = require('../../models/Log');
const { mentionToId }   = require('../../utils/args');

// c logs @user                     → last 20 logs for user
// c logs @user ban                 → ban logs only
// c logs @user captcha             → captcha logs only
// c logs date 2026-09-01           → all logs on that date
// c logs date 2026-09-01 2026-09-07→ logs in date range
// c logs type captcha_failed       → all logs of that type
// c logs recent                    → last 20 logs across all users

const TYPE_FILTERS = {
  ban:     ['permanent_ban','auto_temp_ban_ignored_captcha','manual_ban','manual_unban'],
  captcha: ['captcha_required','captcha_failed','captcha_passed','dm_captcha_sent','captcha_solved'],
  abuse:   ['suspicious_activity','exploit_suspected','captcha_required','auto_temp_ban_ignored_captcha','permanent_ban'],
  summon:  ['summon'],
  battle:  ['battle'],
  vote:    ['vote'],
  weapon:  ['weapon_grant','weapon_crate','weapon_crush'],
};

function formatLogLine(l) {
  const ts  = new Date(l.createdAt);
  const utc = `${ts.getUTCHours().toString().padStart(2,'0')}:${ts.getUTCMinutes().toString().padStart(2,'0')} UTC`;
  const date= ts.toISOString().slice(0,10);
  const user= l.userId ? `<@${l.userId}>` : '';
  const msg = l.message?.slice(0,80) || '';
  return `\`${date} ${utc}\` **${l.type}** ${user} — ${msg}`;
}

module.exports = {
  name: 'logs',
  aliases: ['log'],
  botAdminOnly: true,
  description: 'View and filter bot logs.',

  async execute({ message, args, prefix }) {
    const sub = args[0]?.toLowerCase();

    // ── c logs recent ─────────────────────────────────────────────────────────
    if (!sub || sub === 'recent') {
      const logs = await Log.find().sort({ createdAt: -1 }).limit(20);
      if (!logs.length) return message.reply('No logs found.');

      const lines = logs.map(formatLogLine);
      const embed = new EmbedBuilder()
        .setColor(0x5DADE2)
        .setTitle('📋 Recent Logs (last 20)')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${prefix}logs @user · ${prefix}logs date YYYY-MM-DD · ${prefix}logs type <type>` });
      return message.reply({ embeds: [embed] });
    }

    // ── c logs date YYYY-MM-DD [YYYY-MM-DD] ──────────────────────────────────
    if (sub === 'date') {
      const from = args[1] ? new Date(args[1] + 'T00:00:00Z') : null;
      const to   = args[2] ? new Date(args[2] + 'T23:59:59Z') : args[1] ? new Date(args[1] + 'T23:59:59Z') : null;
      if (!from || isNaN(from)) return message.reply('Usage: `c logs date YYYY-MM-DD` or `c logs date YYYY-MM-DD YYYY-MM-DD`');

      const query = { createdAt: { $gte: from, $lte: to } };
      const logs  = await Log.find(query).sort({ createdAt: -1 }).limit(50);
      if (!logs.length) return message.reply(`No logs found for that date range.`);

      const lines = logs.map(formatLogLine);
      const chunks = [];
      let cur = '';
      for (const line of lines) {
        if ((cur + '\n' + line).length > 3900) { chunks.push(cur); cur = line; }
        else cur = cur ? cur + '\n' + line : line;
      }
      if (cur) chunks.push(cur);

      const embed = new EmbedBuilder()
        .setColor(0x5DADE2)
        .setTitle(`📋 Logs: ${args[1]}${args[2] ? ' → ' + args[2] : ''}`)
        .setDescription(chunks[0] || 'No results.')
        .setFooter({ text: `${logs.length} entries` });
      return message.reply({ embeds: [embed] });
    }

    // ── c logs type <typeName> ────────────────────────────────────────────────
    if (sub === 'type') {
      const typeName = args[1]?.toLowerCase();
      if (!typeName) return message.reply('Usage: `c logs type captcha_failed`');

      const logs = await Log.find({ type: typeName }).sort({ createdAt: -1 }).limit(20);
      if (!logs.length) return message.reply(`No logs of type \`${typeName}\`.`);

      const embed = new EmbedBuilder()
        .setColor(0x5DADE2)
        .setTitle(`📋 Logs: type = ${typeName}`)
        .setDescription(logs.map(formatLogLine).join('\n'))
        .setFooter({ text: `Showing last ${logs.length}` });
      return message.reply({ embeds: [embed] });
    }

    // ── c logs @user [filter] ─────────────────────────────────────────────────
    const userId    = mentionToId(args[0]);
    if (!userId) return message.reply(`Usage:\n\`${prefix}logs @user\`\n\`${prefix}logs @user ban\`\n\`${prefix}logs date YYYY-MM-DD\`\n\`${prefix}logs type <type>\`\n\`${prefix}logs recent\``);

    const filterKey = args[1]?.toLowerCase();
    const query     = { userId };
    if (filterKey && TYPE_FILTERS[filterKey]) query.type = { $in: TYPE_FILTERS[filterKey] };

    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(30);
    if (!logs.length) return message.reply(`No logs for <@${userId}>${filterKey ? ` (filter: ${filterKey})` : ''}.`);

    const lines = logs.map(formatLogLine);
    const chunks = [];
    let cur = '';
    for (const line of lines) {
      if ((cur + '\n' + line).length > 3900) { chunks.push(cur); cur = line; }
      else cur = cur ? cur + '\n' + line : line;
    }
    if (cur) chunks.push(cur);

    const embed = new EmbedBuilder()
      .setColor(0x5DADE2)
      .setTitle(`📋 Logs for <@${userId}>${filterKey ? ` — ${filterKey}` : ''}`)
      .setDescription(chunks[0] || 'None.')
      .setFooter({ text: `Showing ${logs.length} entries • Times in UTC` });
    return message.reply({ embeds: [embed] });
  }
};
