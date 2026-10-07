const { EmbedBuilder } = require('discord.js');

// Full command registry for c help <command>
const COMMAND_DETAILS = {
  // General
  accept:      { usage: 'c accept',                   desc: 'Accept Terms & Privacy Policy to start playing.' },
  daily:       { usage: 'c daily',                    desc: 'Claim your daily Mana reward. Resets 9 AM IST.' },
  profile:     { usage: 'c profile [@user]',          desc: 'View your player profile — Mana, wins, level, streak.' },
  rank:        { usage: 'c rank [@user]',             desc: 'View player account level and XP progress.' },
  vote:        { usage: 'c vote',                     desc: 'Vote for Celestia on top.gg and earn 200 Mana.' },
  translate:   { usage: 'c translate <lang> <text>',  desc: 'Translate text. E.g. c translate hindi Hello' },
  policies:    { usage: 'c policies',                 desc: 'View Terms and Privacy Policy links.' },
  ping:        { usage: 'c ping',                     desc: 'Check if the bot is online.' },
  help:        { usage: 'c help [command]',           desc: 'List all commands, or get details on a specific one.' },
  // Summon
  s:           { usage: 'c s',                        desc: 'Summon a random spirit. Costs 2 Mana.' },
  summon:      { usage: 'c s',                        desc: 'Alias for c s.' },
  sell:        { usage: 'c sell <id/rarity/dupes>',   desc: 'Sell spirits. E.g. c sell common, c sell duplicates.' },
  evolve:      { usage: 'c evolve <spiritId>',        desc: 'Evolve a Mythic/Celestial spirit using a Celestial Stone.' },
  // Collection
  collection:  { usage: 'c col [filter] [page]',      desc: 'Browse your spirits. Filter: c col flame, c col legendary.' },
  spirit:      { usage: 'c spirit <spiritId>',        desc: 'View detailed stats of one owned spirit.' },
  bond:        { usage: 'c bond [spiritId]',          desc: 'View bond progress. No ID = top 5 bonds.' },
  constellation:{ usage: 'c constellation [type]',   desc: 'View constellation map or one type\'s progress.' },
  sanctuary:   { usage: 'c sanctuary [@user]',        desc: 'Full player overview — collection, team, bonds.' },
  equip:       { usage: 'c equip <id> weapon <wId>',  desc: 'Equip a weapon on a spirit.' },
  crush:       { usage: 'c crush <id/rarity>',        desc: 'Crush weapons for Stardust.' },
  stardust:    { usage: 'c stardust [id] [amount]',   desc: 'Check Stardust or convert to spirit XP.' },
  // Battle
  b:           { usage: 'c b [@user] [lvlN]',         desc: 'Battle random opponent. @user = friendly. lvl50 = level cap sim.' },
  battle:      { usage: 'c b [@user]',                desc: 'Alias for c b.' },
  team:        { usage: 'c team [add/remove] [slot] [id]', desc: 'View or edit your 3-spirit battle team.' },
  // Economy
  shop:        { usage: 'c shop',                     desc: 'View the Mana shop.' },
  buy:         { usage: 'c buy <item>',               desc: 'Buy an item from the shop.' },
  use:         { usage: 'c use <item>',               desc: 'Use an item from your inventory.' },
  items:       { usage: 'c items',                    desc: 'View your item inventory.' },
  buttons:     { usage: 'c buttons [target] [on/off]',desc: 'Toggle quick-action buttons under summon/battle.' },
  // Leaderboard
  lb:          { usage: 'c lb [type] [page]',         desc: 'Global leaderboard. Types: mana wins summons streak spirits.' },
  bondlb:      { usage: 'c bondlb [page]',            desc: 'Spirit bond leaderboard.' },
  votelb:      { usage: 'c votelb [monthly] [page]',  desc: 'Vote leaderboard — total or monthly.' },
  ranklb:      { usage: 'c ranklb [page]',            desc: 'Player level leaderboard.' },
  dustlb:      { usage: 'c dustlb [total/available]', desc: 'Stardust leaderboard.' },
  // Giveaway
  giveaway:    { usage: 'c giveaway <prize>',         desc: 'Start a 24h giveaway (admin). Add winners=2 for multiple.' },
  gend:        { usage: 'c gend [messageId]',         desc: 'End a giveaway early (admin).' },
  // Settings (server admin)
  setprefix:   { usage: 'c setprefix <prefix>',       desc: 'Change command prefix for this server.' },
  setlog:      { usage: 'c setlog #channel',          desc: 'Set log channel. c setlog off to disable.' },
  disablecmd:  { usage: 'c disablecmd <cmd> #ch',     desc: 'Disable a command in a specific channel.' },
  enablecmd:   { usage: 'c enablecmd <cmd> #ch',      desc: 'Re-enable a command in a channel.' },
  disabledcmds:{ usage: 'c disabledcmds',             desc: 'List all disabled commands in this server.' },
};

// Commands to HIDE from the main list (staff/admin/internal)
const HIDDEN = new Set([
  'cmdcontrol','cc','announce','ann','setvotechannel','votechannel',
  'banuser','botban','unbanuser','botunban','warn','warning','warnings','warns',
  'timeout','mute','kick','playerprofile','pp','pprofile','checkuser',
  'playerlogs','plogs','userlogs','deletelogs','clearlogs','purgelogs',
  'checkabuse','sendcaptcha','resendcaptcha','dmcaptcha','imagecaptcha','imgcaptcha',
  'captchareset','captchadm','giveitem','givestar','grantkey','addspirit',
  'editspirit','findspirit','reviewstar','approvestar','rejectstar',
  'setseason','givepass',
]);

// Public command categories for main help embed
const CATEGORIES = [
  { name: '🌙 Getting Started',   cmds: ['accept','daily','profile','rank','vote','translate','policies','help'] },
  { name: '✨ Summon',            cmds: ['s','sell','evolve'] },
  { name: '📦 Collection',        cmds: ['collection','spirit','bond','constellation','sanctuary','equip','crush','stardust'] },
  { name: '⚔️ Battle',            cmds: ['b','team'] },
  { name: '💰 Economy',           cmds: ['shop','buy','use','items','buttons'] },
  { name: '🏆 Leaderboard',       cmds: ['lb','bondlb','votelb','ranklb','dustlb'] },
];

module.exports = {
  name: 'help',
  aliases: ['commands', 'cmds'],
  noTermsRequired: true,
  description: 'View all Celestia commands.',

  async execute({ message, args, prefix }) {

    // ── c help <command> — detailed view ──────────────────────────────────────
    if (args[0]) {
      const key     = args[0].toLowerCase().replace(/^c\s*/, '');
      const details = COMMAND_DETAILS[key];

      if (!details) {
        return message.reply(`❌ No help found for \`${key}\`. Use \`${prefix}help\` to see all commands.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0x7B68EE)
        .setTitle(`📖 Command: ${key}`)
        .addFields(
          { name: 'Usage',       value: `\`${details.usage}\``, inline: false },
          { name: 'Description', value: details.desc,           inline: false },
        )
        .setFooter({ text: `${prefix}help — back to full list` });

      return message.reply({ embeds: [embed] });
    }

    // ── Main help embed — all public commands ─────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x7B68EE)
      .setTitle('🌌 Celestia — Command List')
      .setDescription(
        `Prefix: \`${prefix}\` — Type \`${prefix}help <command>\` for details on any command.\n` +
        `Slash commands available — type \`/\` in any channel.`
      );

    for (const cat of CATEGORIES) {
      embed.addFields({
        name:   cat.name,
        value:  cat.cmds.map(c => `\`${c}\``).join('  '),
        inline: false,
      });
    }

    embed.setFooter({ text: 'c help <command> for usage details • Vote: c vote • Support: c policies' });

    return message.reply({ embeds: [embed] });
  }
};
