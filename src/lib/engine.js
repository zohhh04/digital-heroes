import {
  DRAW_NUMBER_MAX, DRAW_NUMBER_MIN, DRAW_NUMBERS_COUNT, TIER_SPLIT,
} from './constants.js';

// ---------- Score rolling logic (PRD §4) ----------
// Rules: integer 1..45, date required, one entry per date,
// keep max 5 most recent by date, newest-first display.
export function validateScoreInput(score, date) {
  if (!date) return 'Score date is required.';
  const n = Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 45) return 'Stableford score must be an integer between 1 and 45.';
  return null;
}

// Pure rolling function — easy to unit test.
// scores: [{score_date, stableford}] existing (any order)
// returns { ok, scores } newest-first (max 5) or { ok:false, error }
export function rollScores(existing, { score_date, stableford }, { allowEdit = false } = {}) {
  const err = validateScoreInput(stableford, score_date);
  if (err) return { ok: false, error: err };
  const dup = existing.find((s) => s.score_date === score_date);
  if (dup && !allowEdit) return { ok: false, error: 'Only one score entry is allowed per date.' };
  let next;
  if (dup && allowEdit) {
    next = existing.map((s) => (s.score_date === score_date ? { ...s, stableford: Number(stableford) } : s));
  } else {
    next = [...existing, { score_date, stableford: Number(stableford) }];
  }
  // newest first, keep 5
  next.sort((a, b) => (a.score_date < b.score_date ? 1 : -1));
  return { ok: true, scores: next.slice(0, 5), replacedOldest: next.length > 5 };
}

// ---------- Prize pool (PRD §6, §22) ----------
export function calcPrizePool({ eligibleRevenue, fundingPct, rolloverJackpot = 0 }) {
  const base = Math.round((Number(eligibleRevenue) * Number(fundingPct)) / 100);
  const total = base + Number(rolloverJackpot || 0);
  const t5 = Math.round(total * TIER_SPLIT[5]);
  const t4 = Math.round(total * TIER_SPLIT[4]);
  const t3 = total - t5 - t4; // avoid rounding drift
  return { base, rolloverJackpot: Number(rolloverJackpot || 0), total, tiers: { 5: t5, 4: t4, 3: t3 } };
}

export function splitTier(tierAmount, winnerCount) {
  if (!winnerCount || winnerCount <= 0) return 0;
  return Math.floor(Number(tierAmount) / winnerCount);
}

// ---------- Draw number helpers ----------
function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// mulberry32 — seeded RNG so simulations are reproducible for tests.
export function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawUniqueNumbers(count, min, max, rng) {
  const set = new Set();
  let guard = 0;
  while (set.size < count && guard++ < 10000) set.add(randInt(rng, min, max));
  return [...set].sort((a, b) => a - b);
}

// Deterministic entry per subscriber: seed from user id hash + retained scores.
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function entryForSubscriber(userId, retainedScores) {
  const seedStr = `${userId}:${(retainedScores || []).map((s) => s.stableford).join(',')}`;
  const rng = seededRng(hashStr(seedStr) || 1);
  return drawUniqueNumbers(DRAW_NUMBERS_COUNT, DRAW_NUMBER_MIN, DRAW_NUMBER_MAX, rng);
}

// Algorithmic mode: weight numbers 1..45 by frequency of retained Stableford
// scores across all eligible subscribers (normalized). Fallback to uniform.
export function weightedWinningNumbers(allRetainedScores, rng) {
  const freq = new Array(DRAW_NUMBER_MAX + 1).fill(0);
  for (const s of allRetainedScores) {
    const n = Number(s.stableford);
    if (n >= DRAW_NUMBER_MIN && n <= DRAW_NUMBER_MAX) freq[n] += 1;
  }
  const total = freq.reduce((a, b) => a + b, 0);
  const pick = () => {
    if (!total) return randInt(rng, DRAW_NUMBER_MIN, DRAW_NUMBER_MAX);
    let r = rng() * total;
    for (let n = DRAW_NUMBER_MIN; n <= DRAW_NUMBER_MAX; n++) { r -= freq[n]; if (r <= 0) return n; }
    return DRAW_NUMBER_MAX;
  };
  const set = new Set(); let guard = 0;
  while (set.size < DRAW_NUMBERS_COUNT && guard++ < 10000) set.add(pick());
  // fill any remainder uniformly (in case of heavy duplicates)
  while (set.size < DRAW_NUMBERS_COUNT) set.add(randInt(rng, DRAW_NUMBER_MIN, DRAW_NUMBER_MAX));
  return [...set].sort((a, b) => a - b);
}

export function countMatches(entry, winning) {
  const w = new Set(winning);
  return entry.filter((n) => w.has(n)).length;
}

export function tierForMatches(m) {
  if (m >= 5) return 5;
  if (m === 4) return 4;
  if (m === 3) return 3;
  return 0;
}

// Full draw evaluation (pure): returns winners grouped by tier.
export function evaluateDraw({ winningNumbers, entries }) {
  // entries: [{ userId, numbers }]
  const grouped = { 5: [], 4: [], 3: [] };
  for (const e of entries) {
    const m = countMatches(e.numbers, winningNumbers);
    const t = tierForMatches(m);
    if (t) grouped[t].push({ userId: e.userId, numbers: e.numbers, matches: m, tier: t });
  }
  return grouped;
}

// ---------- Score-direct winner selection ----------
// The subscriber's saved rolling-5 golf scores ARE the entry.
// Higher Stableford is better. Ranking: total desc, then best desc.
export function scoreMetrics(retainedScores) {
  const vals = (retainedScores || []).map((s) => Number(s.stableford)).filter((n) => Number.isFinite(n));
  const total = vals.reduce((a, b) => a + b, 0);
  const best = vals.length ? Math.max(...vals) : 0;
  const avg = vals.length ? total / vals.length : 0;
  return { total, best, avg, count: vals.length };
}

// participants: [{ userId, scores: [{score_date, stableford}] }]
// Tier mapping (maps to existing 40/35/25 pool split):
//   distinct total level 0 (highest) -> tier 5 (gold)
//   distinct total level 1           -> tier 4 (silver)
//   distinct total level 2           -> tier 3 (bronze)
// Ties on total share the same tier (splitTier divides equally).
// No scores => cannot win (tier 0).
export function rankScoreEntries(participants) {
  const withTotals = (participants || [])
    .map((p) => ({ ...p, ...scoreMetrics(p.scores) }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.total - a.total || b.best - a.best || b.count - a.count);
  const levels = [...new Set(withTotals.map((p) => p.total))];
  const grouped = { 5: [], 4: [], 3: [] };
  const ranked = withTotals.map((p) => {
    const level = levels.indexOf(p.total);
    const tier = level === 0 ? 5 : level === 1 ? 4 : level === 2 ? 3 : 0;
    const row = { ...p, tier, matches: p.total };
    if (tier) grouped[tier].push(row);
    return row;
  });
  return { grouped, ranked, levels };
}

// ---------- Charity (PRD §7) ----------
export function validateContributionPct(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n < 10 || n > 100) return 'Contribution must be between 10% and 100%.';
  return null;
}
export function charityAmount(eligibleAmount, pct) {
  return Math.round((Number(eligibleAmount) * Number(pct)) / 100);
}
