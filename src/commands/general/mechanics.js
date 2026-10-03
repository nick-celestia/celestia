const { TYPE_ADVANTAGE, TYPE_EFFECTS, BATTLE_RULES, RARITY_LIMITS, ECONOMY } = require('../../config/game');

module.exports = {
  name: 'mechanics',
  aliases: ['types', 'formula', 'battleinfo'],
  description: 'Shows Celestia battle formulas, type chart, and team-building parameters.',
  async execute({ message }) {
    const typeLines = Object.entries(TYPE_ADVANTAGE).map(([type, beats]) => {
      const effects = beats.map((target) => `${target} (${TYPE_EFFECTS[type]?.[target]?.name || 'Weakness Break'})`).join(', ');
      return `**${type}** beats ${effects}`;
    });

    const rarityLines = Object.entries(RARITY_LIMITS).map(([tier, limit]) => {
      return `**${tier}**: HP≤${limit.maxHp}, ATK≤${limit.maxAtk}, DEF≤${limit.maxDef}, SPD≤${limit.maxSpd}, Power≤${limit.maxPower}`;
    });

    await message.reply(`📘 **Celestia Mechanics**

**Battle formula**
Battle score = \`(HP×${BATTLE_RULES.weights.hp}) + (ATK×${BATTLE_RULES.weights.atk}) + (DEF×${BATTLE_RULES.weights.def}) + (SPD×${BATTLE_RULES.weights.spd})\`
Then it applies:
- Type advantage: **×${BATTLE_RULES.typeAdvantageMultiplier}**
- Weakness effect: **×${BATTLE_RULES.typeEffectMultiplier}** when advantage triggers
- Random battle variation: **${Math.round(BATTLE_RULES.randomVariationMin * 100)}%–${Math.round(BATTLE_RULES.randomVariationMax * 100)}%**

**Level battle stats**
- HP = Base HP + (Level - 1) × 5
- ATK = Base ATK + (Level - 1)
- DEF = Base DEF + (Level - 1)
- SPD = Base SPD + floor((Level - 1) / 2)

**Type chart**
${typeLines.join('\n')}

**Team building**
Use \`c team analyze\` to see your role balance, coverage, and weaknesses.

**XP/Streak**
Win XP: ${ECONOMY.battleWinXp}, Lose XP: ${ECONOMY.battleLoseXp}. Every ${ECONOMY.battleStreakMilestone} streak gives \`streak × ${ECONOMY.battleStreakManaMultiplier}\` Mana.

**Stat caps for submissions**
${rarityLines.join('\n')}`);
  }
};
