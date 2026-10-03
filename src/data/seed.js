require('dotenv').config();
const { connectDatabase } = require('../database');
const Spirit = require('../models/Spirit');
const starterSpirits = require('./starterSpirits');
const { createOfficialSpirit, slugify } = require('../services/spiritService');

async function seed() {
  await connectDatabase();
  let created = 0;
  for (const data of starterSpirits) {
    const exists = await Spirit.exists({ slug: slugify(data.name) });
    if (exists) continue;
    await createOfficialSpirit(data);
    created += 1;
  }
  console.log(`✅ Seed complete. Created ${created} spirits.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
