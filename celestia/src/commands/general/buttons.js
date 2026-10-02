const { EmbedBuilder }    = require('discord.js');
const { getOrCreateUser } = require('../../services/userService');

// c buttons              → view current button settings
// c buttons summon on    → enable summon button
// c buttons summon off   → disable summon button
// c buttons battle on    → enable battle button
// c buttons battle off   → disable battle button
// c buttons all on       → enable all buttons
// c buttons all off      → disable all buttons

module.exports = {
  name: 'buttons',
  aliases: ['btn', 'quickaction'],
  description: 'Toggle quick-action buttons under summon and battle messages.',

  async execute({ message, args, prefix }) {
    const user   = await getOrCreateUser(message.author.id);
    const target = args[0]?.toLowerCase();
    const state  = args[1]?.toLowerCase();

    // ── View current settings ─────────────────────────────────────────────────
    if (!target) {
      const summonOn = user.buttonPrefs?.summonButton !== false;
      const battleOn = user.buttonPrefs?.battleButton !== false;

      const embed = new EmbedBuilder()
        .setColor(0x5DADE2)
        .setTitle('🎛️ Quick-Action Button Settings')
        .setDescription(
          'Quick-action buttons appear under summon and battle messages, letting you repeat the action without retyping the command.\n\n' +
          `✨ **Summon button:** ${summonOn ? '🟢 Enabled' : '🔴 Disabled'}\n` +
          `⚔️ **Battle button:** ${battleOn ? '🟢 Enabled' : '🔴 Disabled'}`
        )
        .addFields({
          name: 'Commands',
          value:
            `\`${prefix}buttons summon on/off\` — toggle summon button\n` +
            `\`${prefix}buttons battle on/off\` — toggle battle button\n` +
            `\`${prefix}buttons all on/off\` — toggle all buttons`
        })
        .setFooter({ text: 'Buttons have the same cooldown as the commands themselves.' });

      return message.reply({ embeds: [embed] });
    }

    if (!state || !['on', 'off'].includes(state)) {
      return message.reply(`Usage: \`${prefix}buttons <summon|battle|all> <on|off>\``);
    }

    const enabled = state === 'on';

    if (target === 'summon' || target === 'all') {
      user.buttonPrefs.summonButton = enabled;
    }
    if (target === 'battle' || target === 'all') {
      user.buttonPrefs.battleButton = enabled;
    }
    if (!['summon', 'battle', 'all'].includes(target)) {
      return message.reply(`Unknown button type \`${target}\`. Use \`summon\`, \`battle\`, or \`all\`.`);
    }

    user.markModified('buttonPrefs');
    await user.save();

    const label = target === 'all' ? 'All buttons' : `${target[0].toUpperCase() + target.slice(1)} button`;
    return message.reply(`✅ **${label}** ${enabled ? 'enabled 🟢' : 'disabled 🔴'}.`);
  }
};
