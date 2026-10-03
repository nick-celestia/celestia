const GuildConfig = require('../models/GuildConfig');
const env = require('../config/env');

async function getGuildConfig(guildId) {
  if (!guildId) return { prefix: env.defaultPrefix, disabled: false };
  let config = await GuildConfig.findOne({ guildId });
  if (!config) config = await GuildConfig.create({ guildId, prefix: env.defaultPrefix });
  return config;
}

module.exports = { getGuildConfig };
