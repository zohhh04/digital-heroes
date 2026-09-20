// Standalone verification of core business rules (runs in plain Node, no deps).
// Usage: node scripts/verify.mjs
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// Inline minimal copies would drift — instead import from src via dynamic ESM.
// src/lib/engine.js is dependency-free ESM, so direct import works.
const engine = await import('../src/lib/engine.js');

let pass = 0;
function ok(name, fn) { fn(); pass++; console.log('PASS', name); }

// §4 rolling logic
ok('rejects score 0 and 46', () => {
  assert.equal(engine.rollScores([], { score_date: '2026-09-01', stableford: 0 }).ok, false);
  assert.equal(engine.rollScores([], { score_date: '2026-09-01', stableford: 46 }).ok, false);
});
ok('rejects duplicate date', () => {
  const r = engine.rollScores([{ score_date: '2026-09-01', stableford: 30 }], { score_date: '2026-09-01', stableford: 32 });
  assert.equal(r.ok, false);
});
ok('keeps newest 5, drops oldest (A..E + F => B..F)', () => {
  const base = ['01', '02', '03', '04', '05'].map((d, i) => ({ score_date: `2026-09-${d}`, stableford: 20 + i }));
  const r = engine.rollScores(base, { score_date: '2026-09-06', stableford: 40 });
  assert.equal(r.ok, true);
  assert.equal(r.scores.length, 5);
  assert.equal(r.scores[0].score_date, '2026-09-06');
  assert.ok(!r.scores.some((s) => s.score_date === '2026-09-01'));
});
ok('sorts newest first', () => {
  const r = engine.rollScores([{ score_date: '2026-09-01', stableford: 10 }], { score_date: '2026-09-02', stableford: 20 });
  assert.equal(r.scores[0].score_date, '2026-09-02');
});

// §6 prize pool example: ₹100,000 -> 40k/35k/25k
ok('prize example 100k => 40/35/25', () => {
  const p = engine.calcPrizePool({ eligibleRevenue: 200000, fundingPct: 50, rolloverJackpot: 0 });
  assert.equal(p.total, 100000);
  assert.deepEqual(p.tiers, { 5: 40000, 4: 35000, 3: 25000 });
});
ok('equal split + jackpot carry rule', () => {
  assert.equal(engine.splitTier(40000, 2), 20000);
  const p = engine.calcPrizePool({ eligibleRevenue: 0, fundingPct: 50, rolloverJackpot: 40000 });
  assert.equal(p.total, 40000); // only unclaimed jackpot carries, nothing double-counted
});

// §7 charity
ok('contribution clamp 10..100 + math', () => {
  assert.ok(engine.validateContributionPct(9));
  assert.equal(engine.validateContributionPct(15), null);
  assert.equal(engine.charityAmount(1000, 15), 150);
});

// §5 draw engine determinism + tiering
ok('entry deterministic + 5 unique numbers', () => {
  const a = engine.entryForSubscriber('u1', [{ stableford: 30 }]);
  const b = engine.entryForSubscriber('u1', [{ stableford: 30 }]);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 5);
});
ok('evaluate tiers', () => {
  const g = engine.evaluateDraw({ winningNumbers: [1, 2, 3, 4, 5], entries: [{ userId: 'x', numbers: [1, 2, 3, 9, 9] }] });
  assert.equal(g[3].length, 1);
});

console.log(`\nAll ${pass} engine checks passed.`);
void readFileSync;
