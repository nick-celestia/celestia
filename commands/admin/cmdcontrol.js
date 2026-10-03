const DisabledCommand = require('../../models/DisabledCommand');

// ---------------------------------------------------------------------------
// c cmdcontrol disable <command> [reason]
// c cmdcontrol enable  <command>
// c cmdcontrol list
// ---------------------------------------------------------------------------
module.exports = {
  name: 'cmdcontrol',
  aliases: ['cc'],
  description: 'Globally disable or enable a bot command. Bot-owner only.',
  ownerOnly: true,

  async execute({ message, args }) {
    const sub = args[0]?.toLowerCase();

    // ── LIST ────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const disabled = await DisabledCommand.find().sort({ commandName: 1 });
      if (!disabled.length) return message.reply('✅ No commands are currently globally disabled.');

      const lines = disabled.map(
        (d) =>
          `• \`${d.commandName}\` — disabled by <@${d.disabledBy}> on <t:${Math.floor(d.disabledAt / 1000)}:D>${d.reason ? ` | Reason: ${d.reason}` : ''}`
      );
      return message.reply(`🚫 **Globally disabled commands (${disabled.length})**\n${lines.join('\n')}`);
    }

    // ── DISABLE ─────────────────────────────────────────────────────────────
    if (sub === 'disable') {
      const cmdName = args[1]?.toLowerCase();
      if (!cmdName) return message.reply('Usage: `c cmdcontrol disable <commandName> [reason]`');

      const reason = args.slice(2).join(' ') || '';

      // Prevent disabling this command itself or other critical commands
      const protected_ = ['cmdcontrol', 'cc'];
      if (protected_.includes(cmdName))
        return message.reply(`🔒 \`${cmdName}\` cannot be globally disabled.`);

      await DisabledCommand.findOneAndUpdate(
        { commandName: cmdName },
        { commandName: cmdName, disabledBy: message.author.id, reason, disabledAt: new Date() },
        { upsert: true, new: true }
      );

      return message.reply(`🚫 \`${cmdName}\` is now **globally disabled**${reason ? ` — Reason: ${reason}` : ''}. Bot owners can still use it.`);
    }

    // ── ENABLE ──────────────────────────────────────────────────────────────
    if (sub === 'enable') {
      const cmdName = args[1]?.toLowerCase();
      if (!cmdName) return message.reply('Usage: `c cmdcontrol enable <commandName>`');

      const result = await DisabledCommand.findOneAndDelete({ commandName: cmdName });
      if (!result) return message.reply(`✅ \`${cmdName}\` was not globally disabled.`);

      return message.reply(`✅ \`${cmdName}\` is now **globally enabled** again.`);
    }

    // ── HELP ────────────────────────────────────────────────────────────────
    return message.reply(
      '**Command Control — Bot Owner Only**\n' +
      '`c cmdcontrol disable <command> [reason]` — Globally disable a command\n' +
      '`c cmdcontrol enable <command>` — Re-enable a globally disabled command\n' +
      '`c cmdcontrol list` — List all currently disabled commands'
    );
  }
};
