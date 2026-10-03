const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const env       = require('../config/env');
const { clearVerificationByToken, handleVerificationFailure } = require('../services/antiAbuseService');
const { logEvent }   = require('../services/logService');
const { recordVote } = require('../services/voteService');

// ── hCaptcha verify ───────────────────────────────────────────────────────────
async function verifyHCaptcha(responseToken, remoteIp) {
  if (env.captchaDevBypass) return { success: true };
  if (!env.hcaptchaSecret)  return { success: false, error: 'HCAPTCHA_SECRET missing' };

  const body = new URLSearchParams();
  body.append('secret',   env.hcaptchaSecret);
  body.append('response', responseToken || '');
  if (remoteIp) body.append('remoteip', remoteIp);

  const res = await fetch('https://api.hcaptcha.com/siteverify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

// ── Page template ─────────────────────────────────────────────────────────────
function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Celestia</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#080816;color:#fff;
         display:flex;min-height:100vh;align-items:center;justify-content:center}
    .card{width:min(92vw,520px);background:#14142a;border:1px solid #2a2a52;
          border-radius:18px;padding:32px 28px;box-shadow:0 14px 40px rgba(0,0,0,.5)}
    .logo{font-size:36px;margin-bottom:12px}
    h1{font-size:22px;color:#c0b8ff;margin-bottom:10px}
    p{color:#c8c8ee;line-height:1.6;margin-bottom:12px;font-size:15px}
    .small{color:#8888bb;font-size:13px;margin-top:14px}
    button,a.btn{display:block;background:#7B68EE;color:#fff;border:none;border-radius:10px;
           padding:13px 22px;font-size:16px;font-weight:700;cursor:pointer;
           margin-top:16px;width:100%;text-align:center;text-decoration:none;
           transition:background 0.2s}
    button:hover,a.btn:hover{background:#5A50CC}
    .success{color:#4ade80;font-size:18px;font-weight:700}
    .error{color:#f87171;font-size:15px}
    .divider{border:none;border-top:1px solid #2a2a52;margin:20px 0}
    .step{background:#1a1a3e;border-radius:10px;padding:14px 16px;margin-bottom:10px}
    .step strong{color:#a78bfa}
    ul{padding-left:18px;margin:8px 0}
    ul li{color:#c8c8ee;line-height:1.8;font-size:14px}
  </style>
  ${env.captchaEnabled && !env.captchaDevBypass
    ? '<script src="https://js.hcaptcha.com/1/api.js" async defer></script>'
    : ''}
</head>
<body><main class="card"><div class="logo">🌌</div>${body}</main></body>
</html>`;
}

// ── Server ────────────────────────────────────────────────────────────────────
function startWebServer(client) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(rateLimit({ windowMs: 60_000, limit: 60 }));

  // Pass client to routes via app
  app.set('client', client);

  // ── Health / home ───────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.send(page('Celestia Online', `
      <h1>🌌 Celestia is Online</h1>
      <p>The bot is running normally. Verification links and vote webhooks are active.</p>
      <hr class="divider"/>
      <p class="small">This is the web server for the Celestia Discord bot.<br>
      Commands are available inside Discord — invite the bot to get started.</p>
    `));
  });

  // ── Support / payment info page ─────────────────────────────────────────────
  // Players visit this to learn how to purchase STAR or Constellation Key
  app.get('/support', (req, res) => {
    res.send(page('Support Celestia', `
      <h1>⭐ Support Celestia</h1>
      <p>Help keep Celestia running and unlock premium features for yourself.</p>
      <hr class="divider"/>

      <div class="step">
        <strong>✦ Constellation Key</strong> — unlocks the Custom spirit summon pool
        <ul>
          <li>Active for 30 days</li>
          <li>Access Custom spirits (player-created) at 2% rate</li>
          <li>Renew each month to keep access</li>
        </ul>
      </div>

      <div class="step">
        <strong>✦ STAR Token</strong> — submit a custom spirit design
        <ul>
          <li>Design your own spirit with custom name, type, and stats</li>
          <li>Approved spirits enter the game permanently</li>
          <li>You receive a locked copy no one else can take</li>
        </ul>
      </div>

      <hr class="divider"/>
      <p>To purchase, go to our Ko-fi page and leave your Discord username in the note.
         Your item will be granted within 24 hours.</p>
      <a class="btn" href="${process.env.KOFI_URL || 'https://ko-fi.com'}" target="_blank" rel="noopener">
        ☕ Visit Ko-fi to Purchase
      </a>
      <p class="small">
        After purchasing, a staff member will grant your item in Discord.<br>
        Join the <a href="${process.env.SUPPORT_SERVER_URL || '#'}" style="color:#a78bfa">official server</a>
        if you have questions.
      </p>
    `));
  });

  // ── hCaptcha verification page ──────────────────────────────────────────────
  // Link sent IN CHANNEL by antiAbuseService. DM captcha is staff-only (c imagecaptcha).
  app.get('/verify/:token', (req, res) => {
    if (!env.captchaEnabled && !env.captchaDevBypass) {
      return res.send(page('Not Configured', `
        <h1>🛡️ Verification unavailable</h1>
        <p>Captcha is not configured. Contact a staff member in Discord for help.</p>
      `));
    }

    const widget = env.captchaDevBypass
      ? '<p class="small">⚠️ Dev bypass active — captcha skipped.</p>'
      : `<div class="h-captcha" data-sitekey="${env.hcaptchaSiteKey}" style="margin:16px 0"></div>`;

    res.send(page('Verify', `
      <h1>🛡️ Celestia Verification</h1>
      <p>Your account was flagged for unusual activity.</p>
      <p>Complete the check below to unlock your Celestia commands again.</p>
      <form method="post" action="/verify/${req.params.token}">
        ${widget}
        <button type="submit">Verify &amp; Unlock</button>
      </form>
      <p class="small">
        This link was sent in your Discord channel.<br>
        If it expired, run any Celestia command to get a new one.<br>
        You are <strong>not banned</strong> — just locked until verified.
      </p>
    `));
  });

  app.post('/verify/:token', async (req, res) => {
    try {
      const captchaResult = await verifyHCaptcha(req.body['h-captcha-response'], req.ip);

      if (!captchaResult.success) {
        await handleVerificationFailure(client, req.params.token).catch(() => null);
        return res.status(400).send(page('Failed', `
          <h1 class="error">❌ Captcha failed</h1>
          <p>Please go back and try again. You are <strong>not banned</strong>.</p>
          <a class="btn" href="/verify/${req.params.token}">Try Again</a>
          <p class="small">Error: ${JSON.stringify(captchaResult['error-codes'] || captchaResult.error || 'unknown')}</p>
        `));
      }

      const session = await clearVerificationByToken(req.params.token);
      if (!session) {
        return res.status(400).send(page('Expired', `
          <h1>⏳ Link expired or already used</h1>
          <p>Run any Celestia command in Discord to receive a fresh verification link.</p>
        `));
      }

      await logEvent(client, {
        type:    'captcha_solved',
        userId:  session.userId,
        guildId: session.guildId,
        message: 'Player solved hCaptcha verification page.'
      }).catch(() => null);

      // DM player confirmation
      const discordUser = await client.users.fetch(session.userId).catch(() => null);
      if (discordUser) {
        discordUser.send('✅ **Celestia verification complete!** All commands are unlocked again.').catch(() => null);
      }

      return res.send(page('Verified', `
        <h1 class="success">✅ Verified!</h1>
        <p>You can close this page and return to Discord.</p>
        <p>All Celestia commands are unlocked.</p>
      `));

    } catch (err) {
      console.error('[Verify POST]', err);
      return res.status(500).send(page('Error', `
        <h1>Something went wrong</h1>
        <p>Please try again. If this persists, contact a staff member.</p>
      `));
    }
  });

  // ── top.gg vote webhook ─────────────────────────────────────────────────────
  app.post('/topgg-webhook', async (req, res) => {
    const auth = req.headers['authorization'];
    if (!env.topggWebhookSecret || auth !== env.topggWebhookSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user, isWeekend } = req.body;
    if (!user) return res.status(400).json({ error: 'Missing user' });

    res.status(200).json({ ok: true });   // respond fast

    recordVote(client, { userId: user, isWeekend: Boolean(isWeekend) })
      .catch(err => console.error('[Vote Webhook]', err));
  });

  app.listen(env.port, () => console.log(`✅ Web server on port ${env.port}`));
}

module.exports = { startWebServer };
