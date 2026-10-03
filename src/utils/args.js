function parseArgs(input) {
  const out = [];
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    out.push(match[1] || match[2] || match[3]);
  }
  return out;
}

function mentionToId(value) {
  if (!value) return null;
  const match = value.match(/^<@!?(\d+)>$/) || value.match(/^(\d{15,25})$/);
  return match ? match[1] : null;
}

module.exports = { parseArgs, mentionToId };
