const cooldowns = new Map();

function key(userId, command) {
  return `${userId}:${command}`;
}

function checkCooldown(userId, command, seconds) {
  const k = key(userId, command);
  const now = Date.now();
  const until = cooldowns.get(k) || 0;
  if (until > now) {
    return { ok: false, remainingMs: until - now };
  }
  cooldowns.set(k, now + seconds * 1000);
  return { ok: true, remainingMs: 0 };
}

function formatCooldown(ms) {
  return `${Math.ceil(ms / 1000)}s`;
}

module.exports = { checkCooldown, formatCooldown };
