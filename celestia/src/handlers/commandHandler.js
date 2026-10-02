const fs   = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const env        = require('../config/env');
const { LEGAL }  = require('../config/legal');
const { getGuildConfig }            = require('../services/guildService');
const { getOrCreateUser }           = require('../services/userService');
const { checkSecurityBeforeCommand} = require('../services/antiAbuseService');
const DisabledCommand               = require('../models/DisabledCommand');

// ── Exempt sets ───────────────────────────────────────────────────────────────
const TERMS_EXEMPT = new Set([
  'help','policies','policy','terms','privacy','accept','ping'
]);

const CHANNEL_DISABLE_EXEMPT = new Set([
  'enablecmd','disablecmd','disabledcmds','setprefix','setlog',
  'help','policies','policy','terms','privacy','accept','ping'
]);

const GLOBAL_DISABLE_EXEMPT = new Set([
  'cmdcontrol','cc',
  'help','policies','policy','terms','privacy','accept','ping'
]);

// ── Command loader ────────────────────────────────────────────────────────────
function loadCommands(client) {
  client.commands = new Collection();
  client.aliases  = new Collection();

  const base = path.join(__dirname, '..', 'commands');
  for (const folder of fs.readdirSync(base)) {
    const folderPath = path.join(base, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))) {
      const command = require(path.join(folderPath, file));
      if (!command.name || typeof command.execute !== 'function') continue;
      client.commands.set(command.name, command);
      for (const alias of command.aliases || []) client.aliases.set(alias, command.name);
    }
  }
  console.log(`✅ Loaded ${client.commands.size} commands`);
}

// ── Permission helpers ────────────────────────────────────────────────────────
function isOwner(userId)    { return env.ownerIds.includes(userId); }
function isBotAdmin(userId) { return isOwner(userId) || (env.botAdminIds || []).includes(userId); }
function isHelper(userId)   { return isBotAdmin(userId) || (env.helperIds || []).includes(userId); }
function isServerAdmin(msg) { return Boolean(msg.member?.permissions?.has('Administrator')); }

// ── Terms/Privacy helpers ─────────────────────────────────────────────────────
function hasAcceptedPolicies(user) {
  return Boolean(
    user.legal?.termsAcceptedAt &&
    user.legal?.termsVersion   === LEGAL.termsVersion &&
    user.legal?.privacyVersion === LEGAL.privacyVersion
  );
}

function needsPolicyCheck(command, commandName, message) {
  if (TERMS_EXEMPT.has(commandName))   return false;
  if (command.noTermsRequired)          return false;
  if (command.ownerOnly || command.botAdminOnly || command.helperOnly || command.adminOnly) return false;
  if (isHelper(message.author.id))      return false;
  return true;
}

async function sendPolicyPrompt(message, prefix, user) {
  user.legal.lastPolicyPromptAt = new Date();
  await user.save();
  return message.reply([
    '🌙 **Before playing Celestia, please accept the Terms and Privacy Policy.**',
    '',
    `Terms: ${LEGAL.termsUrl}`,
    `Privacy: ${LEGAL.privacyUrl}`,
    '',
    `Type **${prefix}accept** to start playing.`,
    `You can also type **${prefix}policies** anytime to view the links again.`
  ].join('\n'));
}

// ── Channel-disable helper ────────────────────────────────────────────────────
function isDisabledInChannel(guildConfig, channelId, commandName) {
  if (CHANNEL_DISABLE_EXEMPT.has(commandName)) return false;
  const map = guildConfig.disabledCommandsByChannel;
  if (!map) return false;
  const list = typeof map.get === 'function' ? map.get(channelId) : map[channelId];
  return Array.isArray(list) && list.includes(commandName);
}

// ── Main message handler ──────────────────────────────────────────────────────
async function handleMessage(client, message) {
  if (!message.guild || message.author.bot) return;

  const guildConfig = await getGuildConfig(message.guild.id);
  if (guildConfig.disabled && !isOwner(message.author.id)) return;

  const prefix  = guildConfig.prefix || env.defaultPrefix;
  const content = message.content.trim();
  if (!content.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const rest = content.slice(prefix.length).trim();
  if (!rest) return;

  const parts          = rest.split(/\s+/);
  const commandNameRaw = parts.shift().toLowerCase();
  const commandName    = client.commands.has(commandNameRaw)
    ? commandNameRaw
    : client.aliases.get(commandNameRaw);
  if (!commandName) return;

  const command = client.commands.get(commandName);

  // ── 1. Channel-level disable ──────────────────────────────────────────────
  if (isDisabledInChannel(guildConfig, message.channel.id, commandName)) {
    return message.reply(
      `This command is disabled in this channel. ` +
      `Ask a server admin to enable it with \`${prefix}enablecmd ${commandName} #channel\`.`
    );
  }

  // ── 2. Global disable (owner only, via c cmdcontrol) ─────────────────────
  if (!isOwner(message.author.id) && !GLOBAL_DISABLE_EXEMPT.has(commandName)) {
    const entry = await DisabledCommand.findOne({ commandName });
    if (entry) {
      const reason = entry.reason ? ` Reason: ${entry.reason}` : '';
      return message.reply(`🚫 \`${commandName}\` is currently globally disabled.${reason}`);
    }
  }

  // ── 3. Role/permission checks ─────────────────────────────────────────────
  if (command.ownerOnly    && !isOwner(message.author.id))                                return message.reply('Only the Celestia owner can use this command.');
  if (command.botAdminOnly && !isBotAdmin(message.author.id))                             return message.reply('Only Celestia bot admins can use this command.');
  if (command.helperOnly   && !isHelper(message.author.id))                               return message.reply('Only Celestia helpers or higher staff can use this command.');
  if (command.adminOnly    && !isServerAdmin(message) && !isBotAdmin(message.author.id))  return message.reply('Only server admins or Celestia bot admins can use this command.');

  // ── 4. Anti-abuse / security ──────────────────────────────────────────────
  const security = await checkSecurityBeforeCommand(client, message, commandName);
  if (!security.ok) return message.reply(security.reply);

  // ── 5. Terms & Privacy (for regular players only) ─────────────────────────
  if (needsPolicyCheck(command, commandName, message)) {
    const user = await getOrCreateUser(message.author.id);
    if (!hasAcceptedPolicies(user)) return sendPolicyPrompt(message, prefix, user);
  }

  // ── 6. Execute ────────────────────────────────────────────────────────────
  try {
    await command.execute({
      client, message,
      args:    parts,
      rawArgs: rest.slice(commandNameRaw.length).trim(),
      prefix,
      isOwner, isBotAdmin, isHelper
    });
  } catch (error) {
    console.error(error);
    return message.reply('Something broke while running that command. Check the hosting logs.');
  }
}

module.exports = { loadCommands, handleMessage, isOwner, isBotAdmin, isHelper };
