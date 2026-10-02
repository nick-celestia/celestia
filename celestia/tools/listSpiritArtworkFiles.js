const starterSpirits = require('../src/data/starterSpirits');

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

console.log('Expected large artwork files:\n');

for (const spirit of starterSpirits) {
  console.log(`${slugify(spirit.name)}.png`);
}

console.log(`\nTotal: ${starterSpirits.length}`);
