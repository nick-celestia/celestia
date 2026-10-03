const Spirit = require('../models/Spirit');
const UserSpirit = require('../models/UserSpirit');
const { TYPES } = require('../config/game');
const { CONSTELLATIONS } = require('../config/constellations');

async function getConstellationProgress(userId) {
  const officialSpirits = await Spirit.find({
    source: 'official',
    active: true
  }).select('_id name slug emoji types tier');

  const owned = await UserSpirit.find({ ownerId: userId }).select('spirit');
  const ownedIds = new Set(owned.map((entry) => String(entry.spirit)));

  const result = {};

  for (const type of TYPES) {
    const available = officialSpirits.filter((spirit) => spirit.types.includes(type));
    const collected = available.filter((spirit) => ownedIds.has(String(spirit._id)));

    result[type] = {
      type,
      ...CONSTELLATIONS[type],
      total: available.length,
      collected: collected.length,
      complete: available.length > 0 && collected.length >= available.length,
      available,
      collectedSpirits: collected,
      missing: available.filter((spirit) => !ownedIds.has(String(spirit._id)))
    };
  }

  return result;
}

function completedConstellationCount(progress) {
  return Object.values(progress).filter((entry) => entry.complete).length;
}

module.exports = { getConstellationProgress, completedConstellationCount };
