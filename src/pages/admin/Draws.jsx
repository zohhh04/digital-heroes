import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { calcPrizePool, seededRng, drawUniqueNumbers, weightedWinningNumbers, evaluateDraw, entryForSubscriber, splitTier, hashStr } from '../../lib/engine.js';
import { DRAW_NUMBER_MIN, DRAW_NUMBER_MAX, DRAW_NUMBERS_COUNT } from '../../lib/constants.js';
import { uid } from '../../lib/db.js';

function eligibleSubs(db) {
  const now = new Date();
  return db.subscriptions.filter((s) => s.status === 'active' && new Date(s.renewsAt) > now);
}

export default function DrawsAdmin() {
  const { db, setDb } = useAuth();
  const [mode, setMode] = useState('random');
  const [funding, setFunding] = useState(db.settings.prizeFundingPct);
  const subs = eligibleSubs(db);
  const revenue = subs.reduce((a, s) => a + s.amount, 0);
  const preview = calcPrizePool({ eligibleRevenue: revenue, fundingPct: funding, rolloverJackpot: db.settings.rolloverJackpot });

  function createDraw() {
    const id = uid('dr');
    const label = `Draw ${new Date().toISOString().slice(0, 7)} — ${id.slice(-4)}`;
    setDb((d) => ({
      ...d, settings: { ...d.settings, prizeFundingPct: Number(funding) },
      draws: [...d.draws, { id, label, mode, status: 'draft', createdAt: new Date().toISOString(), winning: null, fundingPct: Number(funding) }],
      audit: [...d.audit, { id: uid('au'), at: new Date().toISOString(), msg: `draw created ${label} mode=${mode}` }],
    }));
  }

  function runDraw(drawId, { publish }) {
    const draw = db.draws.find((d) => d.id === drawId);
    const list = eligibleSubs(db);
    const rev = list.reduce((a, s) => a + s.amount, 0);
    const pool = calcPrizePool({ eligibleRevenue: rev, fundingPct: draw.fundingPct ?? db.settings.prizeFundingPct, rolloverJackpot: db.settings.rolloverJackpot });
    const seed = hashStr(drawId + (publish ? ':live' : ':sim') + Date.now());
    const rng = seededRng(seed);
    let winning;
    if (draw.mode === 'algorithmic') {
      const allScores = db.scores.filter((s) => list.some((x) => x.userId === s.userId));
      winning = weightedWinningNumbers(allScores, rng);
    } else {
      winning = drawUniqueNumbers(DRAW_NUMBERS_COUNT, DRAW_NUMBER_MIN, DRAW_NUMBER_MAX, rng);
    }
    const entries = list.map((s) => {
      const retained = db.scores.filter((x) => x.userId === s.userId).sort((a, b) => (a.score_date < b.score_date ? 1 : -1)).slice(0, 5);
      const numbers = entryForSubscriber(s.userId, retained);
      return { userId: s.userId, numbers };
    });
    const grouped = evaluateDraw({ winningNumbers: winning, entries });
    if (!publish) {
      // simulation: do NOT persist winners/payouts
      setDb((d) => ({
        ...d, draws: d.draws.map((x) => x.id === drawId ? { ...x, status: 'simulated', winning, simGrouped: grouped, simPool: pool } : x),
        audit: [...d.audit, { id: uid('au'), at: new Date().toISOString(), msg: `draw simulated ${draw.label}: ${winning.join(',')}` }],
      }));
      return;
    }
    // live run: persist entries, pool, winners; handle jackpot rollover
    const tierCounts = { 5: grouped[5].length, 4: grouped[4].length, 3: grouped[3].length };
    const newEntries = entries.map((e) => {
      const m = winning.filter((n) => e.numbers.includes(n)).length;
      const tier = m >= 5 ? 5 : m === 4 ? 4 : m === 3 ? 3 : 0;
      return { id: uid('en'), drawId, userId: e.userId, numbers: e.numbers, matches: m, tier };
    });
    const winners = [];
    for (const t of [5, 4, 3]) {
      const wt = grouped[t];
      const per = splitTier(pool.tiers[t], wt.length);
      for (const g of wt) winners.push({ id: uid('wn'), drawId, userId: g.userId, tier: t, amount: per, verify: 'pending', payout: 'pending', proofUrl: null, reviewerNote: '', paidAt: null });
    }
    const jackpotUnclaimed = tierCounts[5] === 0 ? pool.tiers[5] : 0;
    setDb((d) => ({
      ...d,
      settings: { ...d.settings, rolloverJackpot: jackpotUnclaimed },
      draws: d.draws.map((x) => x.id === drawId ? { ...x, status: 'drawn', winning } : x),
      entries: [...d.entries.filter((e) => e.drawId !== drawId), ...newEntries],
      pools: [...d.pools.filter((p) => p.drawId !== drawId), { id: uid('pp'), drawId, ...pool, tierCounts }],
      winners: [...d.winners.filter((w) => w.drawId !== drawId), ...winners],
      audit: [...d.audit, { id: uid('au'), at: new Date().toISOString(), msg: `draw LIVE ${draw.label}: ${winning.join(',')} winners=${JSON.stringify(tierCounts)}` }],
    }));
  }

  function setStatus(id, status) { setDb((d) => ({ ...d, draws: d.draws.map((x) => x.id === id ? { ...x, status } : x) })); }

  function clearAllDraws() {
    if (db.draws.length === 0) return alert('No draws to remove.');
    if (!confirm(`Delete all ${db.draws.length} draw(s) + entries, pools, winners and reset jackpot?`)) return;
    setDb((d) => ({ ...d, draws: [], entries: [], pools: [], winners: [], settings: { ...d.settings, rolloverJackpot: 0 } }));
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Draw management</h1>
      <div className="card text-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-slate-400">Create, simulate, run and publish monthly draws.</p>
          <button className="btn-ghost text-xs text-rose ml-auto" onClick={clearAllDraws}>Remove all draws</button>
        </div>
        <p>Eligible subscribers: <b>{subs.length}</b> · eligible revenue ₹{revenue.toLocaleString('en-IN')} · rollover jackpot ₹{db.settings.rolloverJackpot.toLocaleString('en-IN')}</p>
        <p>Preview pool @ {funding}% funding → total ₹{preview.total.toLocaleString('en-IN')} (5: ₹{preview.tiers[5]} · 4: ₹{preview.tiers[4]} · 3: ₹{preview.tiers[3]})</p>
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-[220px]" value={mode} onChange={(e) => setMode(e.target.value)}><option value="random">random</option><option value="algorithmic">algorithmic</option></select>
          <input className="input max-w-[220px]" type="number" value={funding} onChange={(e) => setFunding(e.target.value)} title="Prize funding %" />
          <button className="btn-primary" onClick={createDraw}>Create monthly draw</button>
        </div>
      </div>
      {db.draws.slice().reverse().map((d) => (
        <div key={d.id} className="card text-sm space-y-2">
          <p className="font-bold">{d.label} <span className="badge bg-white/10 ml-1">{d.mode}</span> <span className="badge bg-mint/15 text-mint ml-1">{d.status}</span></p>
          {d.winning && <p>Winning: <b>{d.winning.join(' – ')}</b></p>}
          {d.simGrouped && d.status === 'simulated' && (
            <p className="text-slate-400">SIMULATION (not published, no payouts): 5-match ×{d.simGrouped[5].length} · 4-match ×{d.simGrouped[4].length} · 3-match ×{d.simGrouped[3].length} · pool ₹{d.simPool.total.toLocaleString('en-IN')}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => runDraw(d.id, { publish: false })}>Simulate</button>
            <button className="btn-primary" onClick={() => runDraw(d.id, { publish: true })}>Run actual draw</button>
            <button className="btn-ghost" onClick={() => setStatus(d.id, 'published')}>Publish results</button>
            <button className="btn-ghost" onClick={() => setStatus(d.id, 'closed')}>Close</button>
            <Link className="btn-ghost" to={`/admin/draws/${d.id}/simulation`}>Inspect simulation</Link>
          </div>
        </div>
      ))}
      {db.draws.length === 0 && <div className="card text-sm text-slate-400">No draws yet — create one above.</div>}
    </div>
  );
}
