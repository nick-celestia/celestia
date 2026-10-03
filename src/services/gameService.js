const { randomBetween } = require('../utils/random');
const { ECONOMY } = require('../config/game');
const { getOrCreateUser } = require('./userService');

function validateBet(user, amount) {
  const bet = Number(amount);
  if (!Number.isInteger(bet)) return { ok: false, reason: 'Bet must be a whole number.' };
  if (bet < ECONOMY.minGameBet) return { ok: false, reason: `Minimum bet is ${ECONOMY.minGameBet} Mana.` };
  if (bet > ECONOMY.maxGameBet) return { ok: false, reason: `Maximum bet is ${ECONOMY.maxGameBet} Mana.` };
  if (user.mana < bet) return { ok: false, reason: 'You do not have enough Mana.' };
  return { ok: true, bet };
}

async function coinflip(userId, amount, choice) {
  const user = await getOrCreateUser(userId);
  const valid = validateBet(user, amount);
  if (!valid.ok) return valid;
  const normalized = String(choice || '').toLowerCase();
  if (!['heads', 'tails', 'h', 't'].includes(normalized)) return { ok: false, reason: 'Choose heads or tails.' };

  const pick = ['heads', 'h'].includes(normalized) ? 'heads' : 'tails';
  const result = randomBetween(0, 1) === 0 ? 'heads' : 'tails';
  const won = pick === result;
  const payout = won ? valid.bet * 2 : 0;

  user.mana -= valid.bet;
  user.mana += payout;
  await user.save();

  return { ok: true, user, bet: valid.bet, pick, result, won, payout };
}

async function roll(userId, amount) {
  const user = await getOrCreateUser(userId);
  const valid = validateBet(user, amount);
  if (!valid.ok) return valid;

  const result = randomBetween(1, 100);
  let multiplier = 0;
  if (result >= 51 && result <= 75) multiplier = 1;
  else if (result >= 76 && result <= 99) multiplier = 2;
  else if (result === 100) multiplier = 5;

  const payout = valid.bet * multiplier;
  user.mana -= valid.bet;
  user.mana += payout;
  await user.save();

  return { ok: true, user, bet: valid.bet, result, multiplier, payout, won: payout > valid.bet };
}

module.exports = { coinflip, roll };
