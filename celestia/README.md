# Celestia Discord Bot — Final Starter Build

Celestia is a mythical/celestial Discord collection bot with Mana economy, spirit summoning, 3-spirit battles, shop items, games, custom STAR spirit submissions, and anti-abuse captcha verification.

This project is built to be phone-friendly: upload it to GitHub, connect a hosting site to the GitHub repo, add environment variables on the hosting panel, and run it online.

---

## 1. What is included

### Core game systems

- Prefix bot using `c`
- `c s` / `cs` summon command
- 8-second summon cooldown
- Summon costs 2 Mana
- New users start with 100 Mana
- Duplicate spirits are kept as separate copies
- Mana economy
- `c daily` with 100 Mana reward and daily streak
- Shop items:
  - Lucky Star
  - Battle Charm
  - Rename Scroll
- Selling spirits for Mana
- 3-spirit battle teams
- Battle XP and level growth
- Battle streak milestone rewards
- Coinflip and roll games
- STAR custom spirit submission system
- STAR rejection refund system
- Admin commands
- Captcha-based anti-abuse system

### Security systems

- Command spam tracking
- Summon spam tracking
- Game spam tracking
- Captcha requirement when suspicious activity is detected
- Temporary bot bans
- Permanent bot bans
- Server disable/enable
- Server log channel
- Game/security logs

---

## 2. Current locked game rules

### Bot identity

- Bot name: Celestia
- Theme: mythical/celestial
- Currency: Mana
- Prefix: `c`

### Rarities

1. Common
2. Uncommon
3. Rare
4. Epic
5. Custom
6. Legendary
7. Mythic
8. Celestial

### Spirit types

- Light
- Void
- Flame
- Nature
- Storm
- Tide

### Type advantage

- Light > Void
- Void > Storm
- Storm > Light
- Flame > Nature
- Nature > Tide
- Tide > Flame

### Summon

- Command: `c s`
- Alias style: `cs` also works because prefix `c` + command `s`
- Cost: 2 Mana
- Cooldown: 8 seconds
- Summon directly gives a random spirit
- Duplicates are kept as extra copies

### Daily

- Command: `c daily`
- Reward: 100 Mana
- Cooldown: 24 hours
- Daily streak resets if the user misses more than 48 hours

### Games

#### Coinflip

- Command: `c coinflip <amount> heads/tails`
- Minimum bet: 100 Mana
- Maximum bet: 5000 Mana
- Win: 2x payout
- Lose: lose bet

#### Roll

- Command: `c roll <amount>`
- Roll is 1 to 100
- Payout:
  - 1–50 = 0x
  - 51–75 = 1x, user gets bet back
  - 76–99 = 2x
  - 100 = 5x

Important: games use Mana only. Do not let users buy Mana with real money, cash out Mana, or convert premium items to Mana.


### Deep battle/team-building parameters added

The code exposes the core battle system through `c mechanics` and `c team analyze`, so competitive users can understand how team-building works instead of guessing.

Important files:

```text
src/config/game.js      -> type chart, multipliers, stat caps, economy values
src/utils/stats.js      -> Power Score, battle stats, role detection
src/services/battleService.js -> 3v3 battle calculation and type-effect logic
src/commands/general/mechanics.js -> public formula/type chart command
src/commands/team/team.js -> c team analyze
```

Battle calculation:

```text
Base battle score = HP×0.2 + ATK×2 + DEF×1.4 + SPD×1.2
```

Then the bot applies:

```text
Type advantage = ×1.15
Weakness effect = ×1.05 when the attacker hits a weak type
Random battle variation = 85% to 115%
```

Weakness effects:

```text
Light > Void = Purify
Void > Storm = Silence
Storm > Light = Shock
Flame > Nature = Burn
Nature > Tide = Bind
Tide > Flame = Douse
```

These effects are currently extra battle-pressure multipliers, not long status conditions. This keeps v1 balanced while still giving competitive users meaningful matchups.


### Battle

- Command: `c b`
- Challenge: `c b @user`
- Team size: 3 spirits
- Team commands:
  - `c team`
  - `c team add <1-3> <spiritId>`
  - `c team remove <1-3>`
- Winner gains battle streak +1
- Loser battle streak resets to 0
- Winner team gets 20 XP each
- Loser team gets 5 XP each
- Battle Charm doubles XP for next 10 battles

### Battle streak Mana reward

Every 100 streak milestone gives:

`streak x 10 Mana`

Examples:

- 100 streak = 1000 Mana
- 200 streak = 2000 Mana
- 300 streak = 3000 Mana

### Leveling

Base stats do not change in the database.

Battle stats are calculated during battle using level:

- Battle HP = Base HP + `(Level - 1) x 5`
- Battle ATK = Base ATK + `(Level - 1)`
- Battle DEF = Base DEF + `(Level - 1)`
- Battle SPD = Base SPD + `floor((Level - 1) / 2)`

### Power Score

Power Score is used to check if a spirit’s base stats are balanced.

Formula:

`Power Score = HP / 5 + ATK + DEF + SPD`

HP is divided by 5 because HP numbers are naturally higher than ATK/DEF/SPD.

### Stat limits

| Tier | Max HP | Max ATK | Max DEF | Max SPD | Max Power Score | Sell Value |
|---|---:|---:|---:|---:|---:|---:|
| Common | 80 | 12 | 12 | 12 | 45 | 3 |
| Uncommon | 100 | 16 | 16 | 16 | 60 | 8 |
| Rare | 125 | 22 | 22 | 22 | 80 | 25 |
| Epic | 150 | 30 | 30 | 30 | 105 | 75 |
| Custom | 170 | 34 | 34 | 34 | 120 | 150 |
| Legendary | 190 | 40 | 40 | 40 | 145 | 350 |
| Mythic | 230 | 50 | 50 | 50 | 180 | 1000 |
| Celestial | 270 | 60 | 60 | 60 | 220 | 3000 |

---

## 3. Important file structure

```txt
src/
├─ index.js                  Main bot startup. Do not edit often.
├─ shard.js                  Future sharding startup.
├─ database.js               MongoDB connection.
├─ config/
│  ├─ env.js                 Reads environment variables.
│  └─ game.js                Main game balance settings.
├─ handlers/
│  └─ commandHandler.js      Loads and runs commands.
├─ models/                   MongoDB database schemas.
├─ services/                 Main game logic.
├─ commands/                 Discord command files.
├─ web/
│  └─ server.js              Captcha verification website.
└─ data/
   ├─ starterSpirits.js      Starter spirit list.
   └─ seed.js                Seed script.
```

### Safe files to edit first

- `src/config/game.js`
- `src/data/starterSpirits.js`
- `README.md`

### Files beginners should avoid editing unless needed

- `src/index.js`
- `src/database.js`
- `src/handlers/commandHandler.js`
- `package.json`

---

## 4. Phone-first setup guide

You said you do not want to use terminal/bash every day. That is okay.

The hosting site still runs commands internally, but you set them only once in the hosting panel.

### Step A — Create Discord bot

1. Open Discord Developer Portal.
2. Create a new application.
3. Name it `Celestia`.
4. Go to Bot tab.
5. Create/reset bot token.
6. Copy the token.
7. Enable these privileged gateway intents:
   - Message Content Intent
   - Server Members Intent is not required for this starter version
8. Invite the bot to your test server with permissions:
   - Send Messages
   - Read Message History
   - Use External Emojis
   - Embed Links

Message Content Intent is required because this is a prefix bot and must read messages like `c s`.

### Step B — Create MongoDB Atlas database

1. Go to MongoDB Atlas.
2. Create free cluster.
3. Create database user and password.
4. Go to Network Access.
5. Allow your hosting server IP.
6. If you do not know the hosting IP yet, for testing you can allow `0.0.0.0/0`, but this is less secure.
7. Copy the connection string.
8. Replace username/password/database name.

Example format:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/celestia?retryWrites=true&w=majority
```

### Step C — Upload code to GitHub from phone

1. Create a private GitHub repository.
2. Upload all project files.
3. Do not upload `.env`.
4. You may upload `.env.example` because it does not contain secrets.
5. Make sure `package.json` is in the root of the repo.

### Step D — Connect hosting site

Use a Node.js hosting site that can connect GitHub.

Set:

```txt
Build command: npm install
Start command: npm start
```

Add environment variables in the hosting panel:

```env
DISCORD_TOKEN=your token
MONGODB_URI=your mongodb uri
OWNER_IDS=your Discord user ID
DEFAULT_PREFIX=c
PORT=3000
```

Do not paste your token into code or GitHub.

### Step E — Seed starter spirits

Many hosts allow a console or one-time command. Run this once:

```bash
npm run seed
```

If your host does not allow one-time commands, use the admin command later:

```txt
c addspirit "Luna Fox" <:luna:123> Rare Light 120 20 18 22
```

The bot cannot summon properly until the database has spirits.

---

## 5. Captcha anti-abuse setup

The bot has a built-in web server.

It is used for links like:

```txt
https://your-host-url.com/verify/randomtoken
```

### When captcha is triggered

A user can be forced to verify if they:

- send too many commands in 10 seconds
- attempt too many summons in 10 seconds
- spam too many game commands in 10 seconds
- are manually flagged by admin with `c verifyuser @user reason`

### What happens if captcha fails

If the user fails captcha, they stay locked and must try again. In v3, repeated failed captcha attempts can automatically create a temporary bot ban. Default settings are in `src/config/game.js`:

```js
captchaFailBanAfter: 3,
captchaFailBanMinutes: 30,
captchaRepeatedTriggerBanAfter: 5,
captchaRepeatedTriggerBanMinutes: 60
```

So the default flow is:

1. Suspicious spam triggers verification.
2. User cannot use commands until verified.
3. If they fail captcha 3 times, they receive a 30-minute temporary bot ban.
4. If they repeatedly trigger captcha after being verified, they can receive a 60-minute temporary bot ban.
5. Staff can still use `c banuser @user permanent reason` for severe abuse.

### Setup hCaptcha

1. Create an hCaptcha account.
2. Create a site.
3. Copy Site Key.
4. Copy Secret Key.
5. Add these environment variables:

```env
CAPTCHA_ENABLED=true
PUBLIC_BASE_URL=https://your-host-url.com
HCAPTCHA_SITE_KEY=your-site-key
HCAPTCHA_SECRET=your-secret-key
```

### Private testing without hCaptcha

For private testing only:

```env
CAPTCHA_ENABLED=true
CAPTCHA_DEV_BYPASS=true
PUBLIC_BASE_URL=https://your-host-url.com
```

Never use `CAPTCHA_DEV_BYPASS=true` in public.

### If your host has no public web URL

Captcha links require a public web URL. If your bot host only runs the bot process but does not expose a web server, you have 3 options:

1. Use a host that exposes a public web URL.
2. Host only the captcha web server separately.
3. Keep `CAPTCHA_ENABLED=false` until you move hosting.

---

## 6. Anti-abuse commands

### Force captcha

```txt
c verifyuser @user suspicious activity
```

### Ban user from bot

```txt
c banuser @user 7d spam abuse
c banuser @user permanent severe abuse
```

Durations are flexible. Use any positive number followed by `m`, `h`, or `d`, or use `permanent`.

Examples:

- `30m` = 30 minutes
- `12h` = 12 hours
- `7d` = 7 days
- `11d` = 11 days
- `permanent` = permanent bot ban

Mixed values like `1d12h` are not supported in this starter build. Use `36h` instead.

### Unban user

```txt
c unbanuser @user
```

### Disable bot in server

```txt
c serverdisable reason
c serverenable
```

### Set log channel

Run this in your log channel:

```txt
c setlog
```

### View latest logs

```txt
c logs
```

---

## 7. Premium/custom system

### STAR

STAR allows a user to submit one Custom spirit.

You should not automate payments at the beginning. Use manual payment verification first:

1. User pays through your payment link.
2. You verify payment manually.
3. Run:

```txt
c givestar @user 1
```

### User submits custom spirit

```txt
c submitstar "Aether Cat" <:aethercat:123> Light 160 32 26 28
```

When submitted:

- STAR moves from available to pending.
- Admin reviews it.

If approved:

- STAR is consumed.
- Custom spirit is created.
- Creator receives first locked copy.
- Spirit enters Custom summon pool.

If rejected:

- User receives DM with reason.
- STAR is refunded automatically.

### Approve/reject commands

```txt
c submissions
c approve <submissionId>
c reject <submissionId> stats too high
```

### Custom summon access / Constellation Key

Users can check their access with:

```txt
c key
```

This build currently uses a manual staff-grant system:

```txt
c grantkey @user 30
```

This grants 30 days of access to summon Custom tier spirits. It is intended for manual payment verification at the beginning:

1. User pays for access through your payment link.
2. Staff verifies payment manually.
3. Staff runs `c grantkey @user 30`.
4. User checks status with `c key`.

This means you are not lacking anything: automatic Constellation Key delivery is simply not coded yet. Add it later with a payment webhook, just like automatic STAR delivery. You can rename the concept later in `src/config/game.js` under `PREMIUM`.

---

## 8. Emoji guide

### Easy beginner method

1. Create private Discord server called `Celestia Assets`.
2. Upload spirit emojis there.
3. Type the emoji in chat with a backslash before it:

```txt
\:emoji_name:
```

4. Discord will show something like:

```txt
<:emoji_name:123456789012345678>
```

For animated emoji:

```txt
<a:emoji_name:123456789012345678>
```

5. Use that in:

```txt
c addspirit "Aether Wolf" <:aether:123> Rare Light 120 22 18 20
```

### Static/animated rule

- Common to Legendary: static emoji
- Mythic and Celestial: animated emoji allowed
- Custom spirits: static emoji only

---

## 9. Commands included

### General

```txt
c help
c ping
c profile
c bal
```

### Economy

```txt
c daily
c shop
c buy <item>
c items
c use lucky_star
c use battle_charm
```

### Summon and collection

```txt
c s
cs
c inv
c spirit <id>
c sell <id>
c sell duplicates
c lock <id>
c unlock <id>
c rename <id> <name>
```

### Team and battle

```txt
c team
c team add <1-3> <spiritId>
c team remove <1-3>
c b
c b @user
```

### Games

```txt
c coinflip <amount> heads/tails
c roll <amount>
```

### STAR/custom

```txt
c star
c key
c submitstar "Name" <emoji> <type> <hp> <atk> <def> <spd>
c submissions
c approve <submissionId>
c reject <submissionId> <reason>
```

### Leaderboards

```txt
c lb mana
c lb spirits
c lb summon
c lb streak
c lb beststreak
```

### Admin

```txt
c addspirit "Name" <emoji> <tier> <type> <hp> <atk> <def> <spd>
c givemana @user <amount>
c giveitem @user <item> <amount>
c givestar @user <amount>
c grantkey @user <days>
c banuser @user 7d reason
c banuser @user permanent reason
c unbanuser @user
c verifyuser @user reason
c setprefix <prefix>
c setlog
c logs
c serverdisable reason
c serverenable
```

---

## 10. How to make minor changes safely

### Change summon cost/cooldown

Open:

```txt
src/config/game.js
```

Edit:

```js
summonCost: 2,
summonCooldownSeconds: 8,
```

### Change shop prices

Open:

```txt
src/config/game.js
```

Edit `SHOP_ITEMS`.

### Change game bet limits

Open:

```txt
src/config/game.js
```

Edit:

```js
minGameBet: 100,
maxGameBet: 5000,
```

### Add spirits manually in code

Open:

```txt
src/data/starterSpirits.js
```

Add more objects following the same format.

Then run seed again if possible.

### Add spirits through Discord admin command

This is easier:

```txt
c addspirit "Luna Fox" <:luna:123> Rare Light 120 20 18 22
```

### Never change these unless you know why

```txt
src/index.js
src/database.js
src/handlers/commandHandler.js
```

---

## 11. Important safety notes

- Do not upload `.env` to GitHub.
- Do not share bot token screenshots.
- Do not let real money convert into Mana.
- Do not let Mana convert into real money.
- Do not let STAR be used in games.
- Do not sell Mana directly if games exist.
- Keep games Mana-only.
- Keep captcha enabled before public launch.
- Test everything in a private server first.

---

## 12. Next features to add later

- Proper slash command support
- Dashboard for adding spirits
- Automatic payment webhook for STAR
- Better custom access naming/design
- Event system
- Celestial Stone event shop
- Spirit evolution command
- More anti-alt detection
- Redis caching
- Sharding once the bot reaches large scale



---

## v4 clarifications: Celestial Stone, captcha escalation, and legal checks

### Celestial Stone evolution flow

Yes, the evolution command exists. Admins can give a Celestial Stone with:

```text
c giveitem @user celestial_stone 1
```

The user can then evolve an eligible spirit with:

```text
c evolve <spiritId>
```

Rules:

- Only Mythic and Celestial spirits can evolve.
- Mythic requires level 50.
- Celestial requires level 75.
- The spirit must have an evolved form configured in the database through `evolvesTo`.
- Evolution consumes 1 Celestial Stone.
- The evolved form starts at level 1 with 0 XP.

Celestial Stone is intentionally not in the shop. It should be given from official server events or admin rewards.

### Captcha anti-abuse flow

Captcha is not a punishment by itself. Active grinders may trigger captcha naturally. The punishment happens only when a user is verification-locked and keeps sending commands instead of solving captcha.

Default flow:

```text
Suspicious spam detected
↓
Captcha required
↓
User must solve captcha before using commands again
↓
If user ignores captcha and keeps sending commands, the bot counts blocked commands
↓
After 5 ignored captcha commands, user receives a temporary bot ban
```

Escalation formula:

```text
First ignored-captcha ban = 30 minutes
Next ignored-captcha ban = previous ban × 2 + 6 hours
Maximum auto-ban cap = 7 days
Clean reset = after 14 days without ignored-captcha bans
```

Examples:

```text
1st offense: 30 minutes
2nd offense: 7 hours
3rd offense: 20 hours
4th offense: about 46 hours
5th offense: about 98 hours
Capped later at 7 days
```

Failed captcha attempts are logged, but they do not auto-ban by default. This avoids punishing users for browser/captcha errors.

Settings are in:

```text
src/config/game.js
```

### Legal/copyright checklist before public launch

Before accepting money or launching publicly, check:

- Discord Developer Terms and Developer Policy.
- Discord Premium Apps / monetization requirements for paid bot features.
- Gambling rules: keep Mana gambling fictional only, with no real-money entry, no cashout, no premium-to-Mana conversion.
- Payment provider terms, KYC, refunds, taxes, and receipts.
- Copyright: do not copy OwO code, names, animal database, images, emojis, command text, or branding.
- Trademark/brand: avoid names/logos that can confuse users into thinking Celestia is affiliated with OwO or Discord.
- Art license: use original, commissioned, properly licensed, or self-made emojis/assets.
- Privacy: publish a simple privacy policy if you store user IDs, logs, purchases, or captcha/payment data.
- Age and responsible-play messaging if games/coinflip/roll are public.

This README is not legal advice. For a real paid launch, consult someone qualified for India/your target countries.
