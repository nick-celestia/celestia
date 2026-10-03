const StarSubmission = require('../models/StarSubmission');
const Spirit = require('../models/Spirit');
const { getOrCreateUser } = require('./userService');
const { createUserSpirit, slugify } = require('./spiritService');
const { validateStatsForTier, validateTypes } = require('../utils/stats');

async function submitCustomSpirit(userId, { name, emoji, types, baseStats }) {
  const user = await getOrCreateUser(userId);
  if (user.premium.starsAvailable < 1) return { ok: false, reason: 'You need 1 STAR to submit a Custom spirit.' };

  const typeCheck = validateTypes(types);
  if (!typeCheck.ok) return typeCheck;

  const statCheck = validateStatsForTier('Custom', baseStats);
  if (!statCheck.ok) return statCheck;

  user.premium.starsAvailable -= 1;
  user.premium.starsPending += 1;
  await user.save();

  const submission = await StarSubmission.create({
    submitterId: userId,
    name,
    emoji,
    tier: 'Custom',
    types,
    baseStats,
    status: 'pending'
  });

  return { ok: true, submission, score: statCheck.score };
}

async function approveSubmission(submissionId, adminId) {
  const submission = await StarSubmission.findById(submissionId);
  if (!submission) return { ok: false, reason: 'Submission not found.' };
  if (submission.status !== 'pending') return { ok: false, reason: `Submission is already ${submission.status}.` };

  const baseSlug = slugify(submission.name);
  let slug = baseSlug;
  let n = 1;
  while (await Spirit.exists({ slug })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const spirit = await Spirit.create({
    name: submission.name,
    slug,
    emoji: submission.emoji,
    tier: 'Custom',
    types: submission.types,
    baseStats: submission.baseStats,
    active: true,
    summonable: true,
    source: 'star',
    creatorId: submission.submitterId,
    animatedEmoji: false
  });

  await createUserSpirit(submission.submitterId, spirit._id, 'star_creator_copy', { locked: true });

  const user = await getOrCreateUser(submission.submitterId);
  user.premium.starsPending = Math.max(0, user.premium.starsPending - 1);
  await user.save();

  submission.status = 'approved';
  submission.reviewedBy = adminId;
  submission.spiritId = spirit._id;
  await submission.save();

  return { ok: true, submission, spirit };
}

async function rejectSubmission(submissionId, adminId, reason) {
  const submission = await StarSubmission.findById(submissionId);
  if (!submission) return { ok: false, reason: 'Submission not found.' };
  if (submission.status !== 'pending') return { ok: false, reason: `Submission is already ${submission.status}.` };

  const user = await getOrCreateUser(submission.submitterId);
  user.premium.starsPending = Math.max(0, user.premium.starsPending - 1);
  user.premium.starsAvailable += 1;
  await user.save();

  submission.status = 'rejected';
  submission.reason = reason || 'No reason provided.';
  submission.reviewedBy = adminId;
  await submission.save();

  return { ok: true, submission };
}

module.exports = { submitCustomSpirit, approveSubmission, rejectSubmission };
