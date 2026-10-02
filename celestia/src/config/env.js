require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function csv(name) {
  return (process.env[name] || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
}

function optional(name, fallback = '') {
  return process.env[name] || fallback;
}

module.exports = {
  // Core
  token:           required('DISCORD_TOKEN'),
  mongoUri:        required('MONGODB_URI'),
  ownerIds:        csv('OWNER_IDS'),
  defaultPrefix:   optional('DEFAULT_PREFIX', 'c'),
  port:            Number(optional('PORT', '3000')),

  // Staff IDs
  botAdminIds:     csv('BOT_ADMIN_IDS'),
  helperIds:       csv('HELPER_IDS'),

  // Official server
  officialGuildId: optional('OFFICIAL_GUILD_ID'),

  // Captcha
  publicBaseUrl:     optional('PUBLIC_BASE_URL'),
  captchaEnabled:    process.env.CAPTCHA_ENABLED === 'true',
  captchaDevBypass:  process.env.CAPTCHA_DEV_BYPASS === 'true',
  hcaptchaSiteKey:   optional('HCAPTCHA_SITE_KEY'),
  hcaptchaSecret:    optional('HCAPTCHA_SECRET'),

  // top.gg
  topggBotId:          optional('TOPGG_BOT_ID'),
  topggWebhookSecret:  optional('TOPGG_WEBHOOK_SECRET'),
  voterRoleId:         optional('VOTER_ROLE_ID'),

  // Vote announcement
  // (stored per-guild in GuildConfig — no env needed)

  // Legal
  // (stored in legal.js config — no env needed)
};

// ─────────────────────────────────────────────────────────────────────────────
// Full .env template — copy this to your .env file and fill in values:
//
// # Core
// DISCORD_TOKEN=
// MONGODB_URI=
// OWNER_IDS=your_discord_user_id
// DEFAULT_PREFIX=c
// PORT=3000
//
// # Staff (comma-separated Discord user IDs)
// BOT_ADMIN_IDS=
// HELPER_IDS=
//
// # Official server
// OFFICIAL_GUILD_ID=your_official_server_id
//
// # Captcha
// PUBLIC_BASE_URL=https://your-hosting-url.com
// CAPTCHA_ENABLED=true
// CAPTCHA_DEV_BYPASS=false
// HCAPTCHA_SITE_KEY=
// HCAPTCHA_SECRET=
//
// # top.gg voting
// TOPGG_BOT_ID=your_bot_id
// TOPGG_WEBHOOK_SECRET=any_random_string_you_make_up
// VOTER_ROLE_ID=discord_role_id_for_voter_role
//
// # Activity system (official server only)
// ACTIVITY_CHANNEL_IDS=channel_id_1,channel_id_2   ← only count these channels
// ACTIVITY_WEEKLY_THRESHOLDS=100,500               ← message counts for weekly roles
// ACTIVITY_WEEKLY_ROLE_IDS=role_id_1,role_id_2     ← matching role IDs (same order)
// ACTIVITY_PERM_THRESHOLDS=1000,5000               ← total message counts for perm roles
// ACTIVITY_PERM_ROLE_IDS=role_id_A,role_id_B       ← matching permanent role IDs
// ─────────────────────────────────────────────────────────────────────────────
