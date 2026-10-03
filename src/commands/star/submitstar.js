const { parseArgs } = require('../../utils/args');
const { submitCustomSpirit } = require('../../services/starService');
const { powerScore } = require('../../utils/stats');

module.exports = {
  name: 'submitstar',
  aliases: ['customsubmit'],
  description: 'Submit a Custom spirit using 1 STAR.',
  async execute({ message, rawArgs }) {
    const parsed = parseArgs(rawArgs);
    const [name, emoji, type, hp, atk, def, spd] = parsed;
    if (!name || !emoji || !type || !hp || !atk || !def || !spd) {
      return message.reply('Use: `c submitstar "Aether Cat" <:emoji:123> Light 160 32 26 28`');
    }

    const baseStats = { hp: Number(hp), atk: Number(atk), def: Number(def), spd: Number(spd) };
    const result = await submitCustomSpirit(message.author.id, { name, emoji, types: [type], baseStats });
    if (!result.ok) return message.reply(`❌ ${result.reason}`);

    await message.reply(`🌟 **Custom Spirit submitted!**
Submission ID: \`${result.submission._id}\`
Name: **${name}**
Tier: **Custom**
Type: **${type}**
Power Score: **${powerScore(baseStats).toFixed(1)}**

Your STAR is now pending. If admins reject it, the STAR returns to your inventory automatically.`);
  }
};
