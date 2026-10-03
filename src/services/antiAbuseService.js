const { createHash, randomBytes } = require('node:crypto');
const env = require('../config/env');
const { SECURITY } = require('../config/game');
const { getOrCreateUser } = require('./userService');
const { logEvent } = require('./logService');
const VerificationSession = require('../models/VerificationSession');

const windows = new Map();

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function cleanOld(list, now) {
  return list.filter((ts) => now - ts <= SECURITY.rollingWindowMs);
}

function pushWindow(userId, bucket) {
  const now = Date.now();
  const key = `${userId}:${bucket}`;
  const list = cleanOld(windows.get(key) || [], now);
  list.push(now);
  windows.set(key, list);
  return list.length;
}

async function createVerificationSession(userId, guildId, reason) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SECURITY.verificationSessionMinutes * 60 * 1000);
  await VerificationSession.create({ tokenHash: tokenHash(token), userId, guildId, reason, expiresAt });
  return token;
}

function buildVerificationUrl(token) {
  if (!env.captchaEnabled || !env.publicBaseUrl) return null;
  return `${env.publicBaseUrl.replace(/\/$/, '')}/verify/${token}`;
}

async function requireVerification(client, userId, guildId, reason) {
  const user = await getOrCreateUser(userId);

  // Important: triggering captcha is not itself a punishable action.
  // Grinders can trigger captcha naturally; punishment only happens if they ignore it and keep spamming.
  user.security.captchaTriggerCount = (user.security.captchaTriggerCount || 0) + 1;
  user.security.lastCaptchaTriggeredAt = new Date();

  if (!user.security.verificationRequired) {
    user.security.verificationRequired = true;
    user.security.verificationReason = reason;
    user.security.captchaIgnoredCommands = 0;
    await logEvent(client, { type: 'captcha_required', userId, guildId, message: reason });
  }

  await user.save();

  if (!env.captchaEnabled) return null;
  const token = await createVerificationSession(userId, guildId, reason);
  return buildVerificationUrl(token);
}

// Helper-safe resend function.
// It does NOT force a clean user into captcha; it only resends captcha when the user is already locked.
async function createHelperCaptchaLink(client, userId, guildId, helperId) {
  const user = await getOrCreateUser(userId);

  if (!user.security.verificationRequired) {
    return { ok: false, reason: 'not_required', user };
  }

  const reason = user.security.verificationReason || 'Verification required';
  const token = await createVerificationSession(userId, guildId, reason);
  const link = buildVerificationUrl(token);

  await logEvent(client, {
    type: 'captcha_link_resent',
    userId,
    guildId,
    message: `Captcha link resent by helper/admin <@${helperId}>.`,
    data: { helperId }
  });

  return { ok: true, link, user };
}

function formatDuration(ms) {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function nextCaptchaIgnoreBanMs(user) {
  const firstMs = SECURITY.firstCaptchaIgnoreBanMinutes * 60 * 1000;
  const extraMs = SECURITY.captchaBanExtraHours * 60 * 60 * 1000;
  const maxMs = SECURITY.maxCaptchaBanDays * 24 * 60 * 60 * 1000;

  let previousMs = user.security.lastCaptchaIgnoreBanMs || 0;
  const lastBanAt = user.security.lastCaptchaIgnoreBannedAt ? new Date(user.security.lastCaptchaIgnoreBannedAt).getTime() : 0;
  const cleanResetMs = SECURITY.captchaCleanResetDays * 24 * 60 * 60 * 1000;

  if (lastBanAt && Date.now() - lastBanAt > cleanResetMs) previousMs = 0;
  const nextMs = previousMs ? (previousMs * SECURITY.captchaBanMultiplier) + extraMs : firstMs;
  return Math.min(nextMs, maxMs);
}

async function handleIgnoredVerificationCommand(client, message, user) {
  user.security.captchaIgnoredCommands = (user.security.captchaIgnoredCommands || 0) + 1;
  const ignored = user.security.captchaIgnoredCommands;

  if (ignored >= SECURITY.captchaIgnoreCommandBanAfter) {
    const banMs = nextCaptchaIgnoreBanMs(user);
    user.security.bannedUntil = new Date(Date.now() + banMs);
    user.security.banReason = `Ignored required captcha and kept using commands (${ignored} blocked commands).`;
    user.security.captchaIgnoredCommands = 0;
    user.security.captchaBanCount = (user.security.captchaBanCount || 0) + 1;
    user.security.lastCaptchaIgnoreBanMs = banMs;
    user.security.lastCaptchaIgnoreBannedAt = new Date();
    await user.save();

    await logEvent(client, {
      type: 'auto_temp_ban_ignored_captcha',
      userId: message.author.id,
      guildId: message.guild?.id || null,
      message: `${user.security.banReason} Ban duration: ${formatDuration(banMs)}.`
    });

    return {
      ok: false,
      reply: `🚫 You ignored the required captcha and kept using commands, so you are temporarily banned for ${formatDuration(banMs)}. Solve captcha after the ban ends to use Celestia again.`
    };
  }

  await user.save();

  if (env.captchaEnabled && env.publicBaseUrl) {
    const token = await createVerificationSession(message.author.id, message.guild?.id || null, user.security.verificationReason || 'Verification required');
    const left = SECURITY.captchaIgnoreCommandBanAfter - ignored;
    return {
      ok: false,
      reply: `🛡️ Verification required before using Celestia again. Solve it here: ${env.publicBaseUrl.replace(/\/$/, '')}/verify/${token}\nIgnored captcha commands: ${ignored}/${SECURITY.captchaIgnoreCommandBanAfter}. ${left} more blocked command${left === 1 ? '' : 's'} before a temporary ban.`
    };
  }

  return { ok: false, reply: '🛡️ Verification is required, but captcha is not configured yet. Please contact the bot owner.' };
}

async function checkSecurityBeforeCommand(client, message, commandName) {
  const user = await getOrCreateUser(message.author.id);

  if (user.security.permanentBan) {
    return { ok: false, reply: `🚫 You are permanently banned from using Celestia. Reason: ${user.security.banReason || 'No reason given'}` };
  }

  if (user.security.bannedUntil && new Date(user.security.bannedUntil).getTime() > Date.now()) {
    return { ok: false, reply: `🚫 You are temporarily banned until ${user.security.bannedUntil.toISOString()}. Reason: ${user.security.banReason || 'No reason given'}` };
  }

  if (user.security.verificationRequired) {
    return handleIgnoredVerificationCommand(client, message, user);
  }

  const commandCount = pushWindow(message.author.id, 'commands');
  if (commandCount > SECURITY.maxCommandsPerWindow) {
    const link = await requireVerification(client, message.author.id, message.guild?.id || null, 'Too many commands in a short time.');
    return { ok: false, reply: link ? `🛡️ Too many commands. Please verify here: ${link}` : '🛡️ Too many commands. Verification required.' };
  }

  if (['s', 'summon'].includes(commandName)) {
    const summonCount = pushWindow(message.author.id, 'summons');
    if (summonCount > SECURITY.maxSummonAttemptsPerWindow) {
      const link = await requireVerification(client, message.author.id, message.guild?.id || null, 'Too many summon attempts in a short time.');
      return { ok: false, reply: link ? `🛡️ Summon spam detected. Please verify here: ${link}` : '🛡️ Summon spam detected. Verification required.' };
    }
  }

  if (['coinflip', 'roll'].includes(commandName)) {
    const gameCount = pushWindow(message.author.id, 'games');
    if (gameCount > SECURITY.maxGameCommandsPerWindow) {
      const link = await requireVerification(client, message.author.id, message.guild?.id || null, 'Too many game commands in a short time.');
      return { ok: false, reply: link ? `🛡️ Game spam detected. Please verify here: ${link}` : '🛡️ Game spam detected. Verification required.' };
    }
  }

  return { ok: true };
}

async function handleVerificationFailure(client, rawToken) {
  const session = await VerificationSession.findOne({
    tokenHash: tokenHash(rawToken),
    completedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!session) return { found: false };

  const user = await getOrCreateUser(session.userId);
  user.security.captchaFailedAttempts = (user.security.captchaFailedAttempts || 0) + 1;
  user.security.lastCaptchaFailedAt = new Date();
  await user.save();

  await logEvent(client, {
    type: 'captcha_failed',
    userId: session.userId,
    guildId: session.guildId,
    message: `User failed captcha verification. Failed attempts: ${user.security.captchaFailedAttempts}. No ban was applied; user remains verification-locked.`
  });

  return { found: true, banned: false, userId: session.userId, guildId: session.guildId, failedAttempts: user.security.captchaFailedAttempts };
}

async function clearVerificationByToken(rawToken) {
  const session = await VerificationSession.findOne({
    tokenHash: tokenHash(rawToken),
    completedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!session) return null;

  const user = await getOrCreateUser(session.userId);
  user.security.verificationRequired = false;
  user.security.verificationReason = null;
  user.security.verifiedAt = new Date();
  user.security.captchaFailedAttempts = 0;
  user.security.captchaTriggerCount = 0;
  user.security.captchaIgnoredCommands = 0;
  await user.save();

  session.completedAt = new Date();
  await session.save();
  return session;
}

module.exports = {
  tokenHash,
  checkSecurityBeforeCommand,
  requireVerification,
  createHelperCaptchaLink,
  handleVerificationFailure,
  clearVerificationByToken
};
