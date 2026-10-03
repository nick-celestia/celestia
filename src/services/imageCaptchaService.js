const { createCanvas } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const { logEvent } = require('./logService');
const { getOrCreateUser } = require('./userService');

// ── In-memory captcha sessions ────────────────────────────────────────────────
// Map of userId → { answer, expiresAt, attempts }
// Not persisted — if bot restarts, player just requests a new one.
const sessions = new Map();

const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS      = 3;

// ── Characters that are hard to confuse visually ─────────────────────────────
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

// ── Draw the captcha image ────────────────────────────────────────────────────
function generateCaptchaImage(code) {
  const W = 280, H = 90;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Noise dots
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(${rand(80,180)},${rand(80,180)},${rand(80,180)},0.5)`;
    ctx.beginPath();
    ctx.arc(rand(0, W), rand(0, H), rand(1, 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // Distortion lines
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${rand(100,200)},${rand(100,200)},${rand(100,200)},0.4)`;
    ctx.lineWidth = rand(1, 2);
    ctx.beginPath();
    ctx.moveTo(rand(0, W), rand(0, H));
    ctx.bezierCurveTo(rand(0,W), rand(0,H), rand(0,W), rand(0,H), rand(0,W), rand(0,H));
    ctx.stroke();
  }

  // Draw each character with slight random tilt and position
  const charWidth = 38;
  const startX    = (W - charWidth * code.length) / 2;
  for (let i = 0; i < code.length; i++) {
    ctx.save();
    const x    = startX + i * charWidth + charWidth / 2;
    const y    = H / 2 + rand(-6, 6);
    const angle = (rand(-18, 18) * Math.PI) / 180;
    const size  = rand(28, 38);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font      = `bold ${size}px sans-serif`;
    ctx.fillStyle = `hsl(${rand(0,360)}, 80%, 75%)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code[i], 0, 0);
    ctx.restore();
  }

  // Overlay lines on top of text
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${rand(150,255)},${rand(150,255)},${rand(150,255)},0.3)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, rand(20, 70));
    ctx.lineTo(W, rand(20, 70));
    ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Send a DM captcha to a player ─────────────────────────────────────────────

async function sendDmCaptcha(client, userId, guildId = null, triggeredBy = 'system') {
  // Clear any old session for this user
  sessions.delete(userId);

  const code      = randomCode(6);
  const expiresAt = Date.now() + CAPTCHA_EXPIRY_MS;
  sessions.set(userId, { answer: code, expiresAt, attempts: 0 });

  const imageBuffer = generateCaptchaImage(code);
  const attachment  = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });

  let discordUser;
  try {
    discordUser = await client.users.fetch(userId);
  } catch {
    return { ok: false, reason: 'Could not fetch Discord user.' };
  }

  try {
    await discordUser.send({
      content:
        `🛡️ **Celestia Verification**\n\n` +
        `Type the **6 characters** shown in the image below.\n` +
        `Reply directly to this DM with just the code (e.g. \`AB3K7P\`).\n\n` +
        `⏰ This captcha expires in **5 minutes**.\n` +
        `You have **${MAX_ATTEMPTS} attempts**. Case does not matter.`,
      files: [attachment]
    });
  } catch {
    sessions.delete(userId);
    return { ok: false, reason: 'Could not DM the user — they may have DMs disabled.' };
  }

  await logEvent(client, {
    type:    'dm_captcha_sent',
    userId,
    guildId,
    message: `DM image captcha sent to <@${userId}> (triggered by: ${triggeredBy}).`
  });

  return { ok: true };
}

// ── Verify a DM reply ─────────────────────────────────────────────────────────

async function verifyDmCaptcha(client, userId, guess) {
  const session = sessions.get(userId);

  if (!session) {
    return { ok: false, reason: 'No active captcha session. Ask staff to send you a new one.' };
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(userId);
    return { ok: false, reason: 'Your captcha expired. Ask staff to send you a new one with `c dmcaptcha @you`.' };
  }

  session.attempts += 1;

  if (guess.trim().toUpperCase() !== session.answer) {
    const remaining = MAX_ATTEMPTS - session.attempts;

    if (remaining <= 0) {
      sessions.delete(userId);
      await logEvent(client, {
        type:    'captcha_failed',
        userId,
        guildId: null,
        message: `Failed DM image captcha ${MAX_ATTEMPTS} times. Session expired.`
      });
      return {
        ok:     false,
        reason: `❌ Too many wrong attempts. Your captcha session has expired.\nAsk a staff member to send a new one.`
      };
    }

    await logEvent(client, {
      type:    'captcha_failed',
      userId,
      guildId: null,
      message: `Wrong DM captcha answer (attempt ${session.attempts}/${MAX_ATTEMPTS}).`
    });

    return {
      ok:     false,
      reason: `❌ Wrong code. **${remaining} attempt${remaining === 1 ? '' : 's'}** remaining.`
    };
  }

  // ── Correct! Clear verification flag on the user ──────────────────────────
  sessions.delete(userId);

  const user = await getOrCreateUser(userId);
  user.security.verificationRequired  = false;
  user.security.verificationReason    = null;
  user.security.verifiedAt            = new Date();
  user.security.captchaFailedAttempts = 0;
  user.security.captchaTriggerCount   = 0;
  user.security.captchaIgnoredCommands = 0;
  await user.save();

  await logEvent(client, {
    type:    'captcha_passed',
    userId,
    guildId: null,
    message: `User passed DM image captcha and is now verified.`
  });

  return { ok: true };
}

// ── Check if a DM message is a captcha reply ──────────────────────────────────
// Call this from your messageCreate handler for DMs

async function handleDmMessage(client, message) {
  // Only handle DMs from non-bots with an active session
  if (message.author.bot) return false;
  if (message.guild) return false;           // ignore guild messages
  if (!sessions.has(message.author.id)) return false; // no active session

  const result = await verifyDmCaptcha(client, message.author.id, message.content);

  if (result.ok) {
    await message.reply(
      `✅ **Verified!** You can now use Celestia again.\nHead back to any server with the bot and continue playing.`
    );
  } else {
    await message.reply(result.reason);
  }

  return true; // signal that the DM was handled
}

module.exports = { sendDmCaptcha, verifyDmCaptcha, handleDmMessage };
