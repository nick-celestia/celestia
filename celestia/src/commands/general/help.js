module.exports = {
  name: 'help',
  aliases: ['h'],
  description: 'Show command list.',
  async execute({ message, prefix }) {
    return message.reply(`🌌 **Celestia Commands**

**Main**
\`${prefix}profile\`, \`${prefix}daily\`, \`${prefix}sanctuary\`

**Summon & Collection**
\`${prefix}s\`, \`${prefix}inv\`, \`${prefix}spirit <id>\`, \`${prefix}sell <id>\`, \`${prefix}lock <id>\`, \`${prefix}unlock <id>\`

**Constellations & Bond**
\`${prefix}constellation\`, \`${prefix}constellation <type>\`, \`${prefix}bond\`, \`${prefix}bond <spiritId>\`, \`${prefix}bondlb\`

**Team & Battle**
\`${prefix}team\`, \`${prefix}team add <1-3> <spiritId>\`, \`${prefix}team remove <1-3>\`, \`${prefix}b\`, \`${prefix}b @user\`

**Shop & Items**
\`${prefix}shop\`, \`${prefix}buy <item>\`, \`${prefix}items\`, \`${prefix}use <item>\`, \`${prefix}rename <spiritId> <name>\`

**Games**
\`${prefix}coinflip <100-5000> heads/tails\`, \`${prefix}roll <100-5000>\`

**Custom Spirits**
\`${prefix}star\`, \`${prefix}submitstar "Name" <emoji> <type> <hp> <atk> <def> <spd>\`

**Leaderboards**
\`${prefix}lb mana\`, \`${prefix}lb summon\`, \`${prefix}lb streak\`, \`${prefix}lb spirits\`, \`${prefix}lb bond\``);
  }
};
