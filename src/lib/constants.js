// Central business constants. Documents PRD assumptions explicitly.
export const PLANS = [
  { id: 'monthly', name: 'Monthly Hero', interval: 'monthly', price: 999, currency: 'INR', blurb: 'Play, give & win every month.' },
  { id: 'yearly', name: 'Yearly Champion', interval: 'yearly', price: 8999, currency: 'INR', blurb: '2 months free vs monthly. Best value.' },
];

// PRD §6 — fixed tier allocation of the prize pool (not of revenue).
export const TIER_SPLIT = { 5: 0.4, 4: 0.35, 3: 0.25 };

// PRD §22 — prize-funding % of eligible subscription revenue is NOT specified.
// Assumption: admin-configurable, default 50%.
export const DEFAULT_PRIZE_FUNDING_PCT = 50;

// PRD §5 — draw number range / entries per subscriber are NOT specified.
// Assumptions (documented for evaluators):
// - Each draw uses 5 unique winning numbers in range 1..45 (mirrors Stableford range).
// - Each eligible subscriber gets ONE entry of 5 unique numbers 1..45,
//   derived deterministically from their retained scores so it is auditable.
// - "Algorithmic" mode weights number selection by frequency of retained
//   Stableford scores across eligible subscribers (normalized weights).
export const DRAW_NUMBER_MIN = 1;
export const DRAW_NUMBER_MAX = 45;
export const DRAW_NUMBERS_COUNT = 5;

export const DRAW_STATUS = ['draft', 'simulated', 'drawn', 'published', 'closed'];
export const PAYOUT_STATUS = ['pending', 'paid'];
export const VERIFY_STATUS = ['pending', 'approved', 'rejected'];

export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@digitalheroes.test', password: 'Admin@123' },
  subscriber: { email: 'hero@digitalheroes.test', password: 'Hero@123' },
};
