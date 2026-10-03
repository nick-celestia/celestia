const fs   = require('node:fs');
const path = require('node:path');

// GIF added for animated Legendary/Mythic/Celestial/Ascended spirits.
// Check order matters — GIF checked first so animated versions take priority
// if both a PNG and GIF exist for the same spirit.
const SUPPORTED_EXTENSIONS = ['.gif', '.png', '.webp', '.jpg', '.jpeg'];

function safeSlug(slug) {
  return String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

// Finds artwork file for a spirit by slug.
// Returns { absolutePath, fileName, animated } or null.
function findSpiritArtwork(slug) {
  const cleanSlug      = safeSlug(slug);
  if (!cleanSlug) return null;

  const artworkDirectory = path.resolve(process.cwd(), 'assets', 'spirits');

  for (const ext of SUPPORTED_EXTENSIONS) {
    const fileName     = `${cleanSlug}${ext}`;
    const absolutePath = path.join(artworkDirectory, fileName);

    if (fs.existsSync(absolutePath)) {
      return {
        absolutePath,
        fileName,
        animated: ext === '.gif'
      };
    }
  }

  // Fallback — default image if spirit has no specific artwork yet
  const fallbackPath = path.join(artworkDirectory, 'default.png');
  if (fs.existsSync(fallbackPath)) {
    return {
      absolutePath: fallbackPath,
      fileName:     'default.png',
      animated:     false
    };
  }

  return null;
}

module.exports = { SUPPORTED_EXTENSIONS, findSpiritArtwork };
