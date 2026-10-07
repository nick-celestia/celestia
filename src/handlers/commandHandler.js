const fs   = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const env        = require('../config/env');
const { LEGAL }  = require('../config/legal');
const { getGuildConfig }             = require('../services/guildService');
const { getOrCreateUser }            = require('../services/userService');
const { checkSecurityBeforeCommand } = require('../services/antiAbuseService');
const DisabledCommand                = require('../models/DisabledCommand');

const TERMS_EXEMPT = new Set(['help','policies','policy','terms','privacy','accept','ping']);
const CHANNEL_DISABLE_EXEMPT = new Set(['enablecmd','disablecmd','disabledcmds','setprefix','setlog','help','policies','policy','terms','privacy','accept','ping']);
const GLOBAL_DISABLE_EXEMPT  = new Set(['cmdcontrol','cc','help','policies','policy','terms','privacy','accept','ping']);

// ── send helper — always uses channel.send, never reply ──────────────────────
// This removes the "reply" arrow from all bot responses per issue #1
function send(message, payload) {
  if (typeof payload === 'string') return message.channel.send(payload);
  return message.channel.send(payload);
}

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

function isOwner(userId)    { return env.ownerIds.includes(userId); }
function isBotAdmin(userId) { return isOwner(userId) || (env.botAdminIds || []).includes(userId); }
function isHelper(userId)   { return isBotAdmin(userId) || (env.helperIds || []).includes(userId); }
function isServerAdmin(msg) { return Boolean(msg.member?.permissions?.has('Administrator')); }

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
  return send(message, [
    '🌙 **Before playing Celestia, please accept the Terms and Privacy Policy.**',
    '',
    `Terms: ${LEGAL.termsUrl}`,
    `Privacy: ${LEGAL.privacyUrl}`,
    '',
    `Type **${prefix}accept** to start playing.`,
  ].join('\n'));
}

function isDisabledInChannel(guildConfig, channelId, commandName) {
  if (CHANNEL_DISABLE_EXEMPT.has(commandName)) return false;
  const map = guildConfig.disabledCommandsByChannel;
  if (!map) return false;
  const list = typeof map.get === 'function' ? map.get(channelId) : map[channelId];
  return Array.isArray(list) && list.includes(commandName);
}

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

  if (isDisabledInChannel(guildConfig, message.channel.id, commandName)) {
    return send(message, `This command is disabled in this channel.`);
  }

  if (!isOwner(message.author.id) && !GLOBAL_DISABLE_EXEMPT.has(commandName)) {
    const entry = await DisabledCommand.findOne({ commandName });
    if (entry) {
      const reason = entry.reason ? ` Reason: ${entry.reason}` : '';
      return send(message, `🚫 \`${commandName}\` is currently globally disabled.${reason}`);
    }
  }

  if (command.ownerOnly    && !isOwner(message.author.id))                                return send(message, 'Only the Celestia owner can use this command.');
  if (command.botAdminOnly && !isBotAdmin(message.author.id))                             return send(message, 'Only Celestia bot admins can use this command.');
  if (command.helperOnly   && !isHelper(message.author.id))                               return send(message, 'Only Celestia helpers or higher staff can use this command.');
  if (command.adminOnly    && !isServerAdmin(message) && !isBotAdmin(message.author.id))  return send(message, 'Only server admins or Celestia bot admins can use this command.');

  // ── ISSUE #16: Owner immune to captcha/security checks ───────────────────
  if (!isOwner(message.author.id)) {
    const security = await checkSecurityBeforeCommand(client, message, commandName);
    if (!security.ok) return send(message, security.reply);
  }

  if (needsPolicyCheck(command, commandName, message)) {
    const user = await getOrCreateUser(message.author.id);
    if (!hasAcceptedPolicies(user)) return sendPolicyPrompt(message, prefix, user);
  }

  // Patch message.reply to use channel.send for all commands
  // This ensures ALL command replies never use Discord's reply system
  message.reply = (payload) => send(message, payload);

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
    return send(message, 'Something broke while running that command. Check the hosting logs.');
  }
}

module.exports = { loadCommands, handleMessage, isOwner, isBotAdmin, isHelper };
