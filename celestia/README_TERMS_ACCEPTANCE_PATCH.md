# Celestia Terms + Privacy + Acceptance Gate Patch

This patch adds:

- `TERMS_OF_SERVICE.md`
- `PRIVACY_POLICY.md`
- `c accept`
- `c policies`
- a player acceptance gate before gameplay commands
- database fields to record acceptance version/time

## What problem this solves

Instead of saying "anyone who types c help automatically accepts," this patch makes the user take a clear action.

Example flow:

1. New user types `c daily`.
2. Bot replies with Terms + Privacy links.
3. Bot tells user to type `c accept`.
4. User types `c accept`.
5. Bot records:
   - accepted time
   - terms version
   - privacy version
   - guild/channel where accepted
6. User can now play.

## Files to add/replace

Add these new files:

- `TERMS_OF_SERVICE.md`
- `PRIVACY_POLICY.md`
- `src/config/legal.js`
- `src/commands/general/accept.js`
- `src/commands/general/policies.js`

Replace these files:

- `src/models/User.js`
- `src/handlers/commandHandler.js`

## Important compatibility note

This patch is written to be compatible with the newer roles/helper permission system:

- `OWNER_IDS`
- `BOT_ADMIN_IDS`
- `HELPER_IDS`

If you have not applied the Roles + Captcha Helper Patch yet, apply that first or make sure your `src/config/env.js` supports these fields.

## Hosting environment variables

After you upload Terms and Privacy somewhere public, set these in your hosting panel:

```env
TERMS_URL=https://your-public-terms-link
PRIVACY_URL=https://your-public-privacy-link
SUPPORT_SERVER_URL=https://your-support-server-or-contact-page
TERMS_VERSION=2026-07-12
PRIVACY_VERSION=2026-07-12
```

The version values matter. If you later make a major change, change the version:

```env
TERMS_VERSION=2026-09-01
PRIVACY_VERSION=2026-09-01
```

Then old users will be asked to accept again.

## Where to host Terms and Privacy

Good beginner options:

### Option A: GitHub public repo

Create a public repo like:

`celestia-legal`

Upload:

- `TERMS_OF_SERVICE.md`
- `PRIVACY_POLICY.md`

Then use the public GitHub file links as `TERMS_URL` and `PRIVACY_URL`.

### Option B: GitHub Pages

Better and cleaner later. Same legal repo, but enable GitHub Pages so you get a website-like link.

### Option C: Notion / Google Docs

Easy, but less professional and links can look messy.

### Option D: Your own website

Best long-term option:
- `celestiabot.com/terms`
- `celestiabot.com/privacy`

## What commands are exempt?

The bot allows these before acceptance:

- `c help`
- `c policies`
- `c policy`
- `c terms`
- `c privacy`
- `c accept`
- `c ping`

Staff and server-admin configuration commands are also not blocked by the player acceptance gate.

## How to install from phone/GitHub

1. Download and unzip this patch.
2. Open your GitHub bot repo.
3. Create/replace each file using the same path.
4. Commit changes.
5. Redeploy/restart the bot.
6. Add `TERMS_URL`, `PRIVACY_URL`, and versions in hosting variables.
7. Test with a fresh Discord account or ask a friend to try `c daily`.

## Test checklist

Use a user who has not accepted yet:

- `c help` should work.
- `c policies` should show links.
- `c daily` should show acceptance prompt.
- `c accept` should work.
- `c daily` should work after acceptance.

## Important

This is a practical starter template, not legal advice. Before serious monetization, ask a qualified lawyer/CA to review your Terms, Privacy Policy, payment flow, and tax setup.
