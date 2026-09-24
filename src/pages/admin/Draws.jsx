import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { calcPrizePool, seededRng, drawUniqueNumbers, weightedWinningNumbers, evaluateDraw, entryForSubscriber, rankScoreEntries, scoreMetrics, splitTier, hashStr } from '../../lib/engine.js';
import { DRAW_NUMBER_MIN, DRAW_NUMBER_MAX, DRAW_NUMBERS_COUNT } from '../../lib/constants.js';
import { uid } from '../../lib/db.js';

function eligibleSubs(db) {
  const now = new Date();
  return db.subscriptions.filter((s) => s.status === 'active' && new Date(s.renewsAt) > now);
}

function retainedFor(db, userId) {
  return db.scores.filter((x) => x.userId === userId).sort((a, b) => (a.score_date < b.score_date ? 1 : -1)).slice(0, 5);
}

function previewEntries(db, list) {
  return list.map((s) => {
    const retained = retainedFor(db, s.userId);
    const u = db.users.find((x) => x.id === s.userId);
    const m = scoreMetrics(retained);
    return { userId: s.userId, email: u?.email || s.userId, scores: retained, total: m.total, best: m.best, numbers: entryForSubscriber(s.userId, retained) };
  });
}

export default function DrawsAdmin() {
  const { db, setDb, cloudStatus, cloudEnabled } = useAuth();
  const [mode, setMode] = useState('scores');
  const [funding, setFunding] = useState(db.settings.prizeFundingPct);
  const subs = eligibleSubs(db);
  const revenue = subs.reduce((a, s) => a + s.amount, 0);
  const preview = calcPrizePool({ eligibleRevenue: revenue, fundingPct: funding, rolloverJackpot: db.settings.rolloverJackpot });
  const entryPreview = previewEntries(db, subs);
  // Everyone else: show WHY their scores are not in the draw (no/lapsed sub).
  const eligibleIds = new Set(subs.map((s) => s.userId));
  const ineligible = db.users.filter((u) => u.role !== 'admin' && !eligibleIds.has(u.id)).map((u) => {
    const userSubs = db.subscriptions.filter((s) => s.userId === u.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const latest = userSubs[0] || null;
    let reason = 'no subscription — ask user to complete payment on Subscription page';
    if (latest) {
      if (latest.status !== 'active') reason = `subscription ${latest.status} — needs active paid plan`;
      else if (new Date(latest.renewsAt) <= new Date()) reason = `subscription expired ${new Date(latest.renewsAt).toLocaleDateString()} — needs renewal`;
    }
    return { user: u, reason, latest, scores: retainedFor(db, u.id) };
  });

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

    // SCORE-DIRECT MODE (default): saved subscriber rolling-5 scores ARE the draw.
    // No lottery numbers — highest total wins (Tier 5 gold / Tier 4 silver / Tier 3 bronze).
    if (draw.mode === 'scores') {
      const participants = list.map((s) => {
        const retained = retainedFor(db, s.userId);
        return { userId: s.userId, scores: retained.map((r) => ({ score_date: r.score_date, stableford: Number(r.stableford) })) };
      });
      const { grouped, ranked } = rankScoreEntries(participants);
      if (!publish) {
        const simEntries = ranked.map((r) => ({
          userId: r.userId, scores: r.scores, numbers: r.scores.map((x) => Number(x.stableford)),
          total: r.total, best: r.best, matches: r.total, tier: r.tier,
        }));
        setDb((d) => ({
          ...d, draws: d.draws.map((x) => x.id === drawId ? { ...x, status: 'simulated', winning: null, simGrouped: grouped, simPool: pool, simEntries } : x),
          audit: [...d.audit, { id: uid('au'), at: new Date().toISOString(), msg: `draw simulated (scores) ${draw.label}: ${ranked.map((r) => `${r.userId}=${r.total}`).join(' ')}` }],
        }));
        return;
      }
      const tierCounts = { 5: grouped[5].length, 4: grouped[4].length, 3: grouped[3].length };
      const newEntries = ranked.map((r) => ({
        id: uid('en'), drawId, userId: r.userId, numbers: r.scores.map((x) => Number(x.stableford)),
        matches: r.total, tier: r.tier, scores: r.scores, total: r.total, best: r.best,
      }));
      // Also record non-winners (no scores / below top 3 levels) so admin sees everyone evaluated.
      for (const p of participants) {
        if (!newEntries.some((e) => e.userId === p.userId)) {
          const m = scoreMetrics(p.scores);
          newEntries.push({ id: uid('en'), drawId, userId: p.userId, numbers: p.scores.map((x) => Number(x.stableford)), matches: m.total, tier: 0, scores: p.scores, total: m.total, best: m.best });
        }
      }
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
        draws: d.draws.map((x) => x.id === drawId ? { ...x, status: 'drawn', winning: null } : x),
        entries: [...d.entries.filter((e) => e.drawId !== drawId), ...newEntries],
        pools: [...d.pools.filter((p) => p.drawId !== drawId), { id: uid('pp'), drawId, ...pool, tierCounts }],
        winners: [...d.winners.filter((w) => w.drawId !== drawId), ...winners],
        audit: [...d.audit, { id: uid('au'), at: new Date().toISOString(), msg: `draw LIVE (scores) ${draw.label}: winners=${JSON.stringify(tierCounts)}` }],
      }));
      return;
    }

    const seed = hashStr(drawId + (publish ? ':live' : ':sim') + Date.now());
    const rng = seededRng(seed);
    const entries = list.map((s) => {
      const retained = retainedFor(db, s.userId);
      const numbers = entryForSubscriber(s.userId, retained);
      return { userId: s.userId, numbers, scores: retained.map((r) => ({ score_date: r.score_date, stableford: r.stableford })) };
    });
    let winning;
    if (draw.mode === 'algorithmic') {
      // Weight by the same retained-5 scores used for entries (not all historic rows).
      const allScores = entries.flatMap((e) => e.scores);
      winning = weightedWinningNumbers(allScores, rng);
    } else {
      winning = drawUniqueNumbers(DRAW_NUMBERS_COUNT, DRAW_NUMBER_MIN, DRAW_NUMBER_MAX, rng);
    }
    const grouped = evaluateDraw({ winningNumbers: winning, entries });
    if (!publish) {
      // simulation: do NOT persist winners/payouts, but keep a score-linked
      // snapshot so admin can inspect which golf scores produced each entry.
      const simEntries = entries.map((e) => {
        const m = winning.filter((n) => e.numbers.includes(n)).length;
        const tier = m >= 5 ? 5 : m === 4 ? 4 : m === 3 ? 3 : 0;
        return { ...e, matches: m, tier };
      });
      setDb((d) => ({
        ...d, draws: d.draws.map((x) => x.id === drawId ? { ...x, status: 'simulated', winning, simGrouped: grouped, simPool: pool, simEntries } : x),
        audit: [...d.audit, { id: uid('au'), at: new Date().toISOString(), msg: `draw simulated ${draw.label}: ${winning.join(',')}` }],
      }));
      return;
    }
    // live run: persist entries, pool, winners; handle jackpot rollover
    const tierCounts = { 5: grouped[5].length, 4: grouped[4].length, 3: grouped[3].length };
    const newEntries = entries.map((e) => {
      const m = winning.filter((n) => e.numbers.includes(n)).length;
      const tier = m >= 5 ? 5 : m === 4 ? 4 : m === 3 ? 3 : 0;
      return { id: uid('en'), drawId, userId: e.userId, numbers: e.numbers, matches: m, tier, scores: e.scores };
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
        <p>Eligible subscribers: <b>{subs.length}</b> · eligible revenue ₹{revenue.toLocaleString('en-IN')} · rollover jackpot ₹{db.settings.rolloverJackpot.toLocaleString('en-IN')} · {cloudEnabled ? <span>cloud sync <b className="text-mint">{cloudStatus}</b></span> : <span className="text-gold">this browser only — add Supabase for cross-device</span>}</p>
        <p>Preview pool @ {funding}% funding → total ₹{preview.total.toLocaleString('en-IN')} (5: ₹{preview.tiers[5]} · 4: ₹{preview.tiers[4]} · 3: ₹{preview.tiers[3]})</p>
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-[220px]" value={mode} onChange={(e) => setMode(e.target.value)}><option value="scores">scores (golf results win)</option><option value="random">random (legacy lottery)</option><option value="algorithmic">algorithmic (legacy lottery)</option></select>
          <input className="input max-w-[220px]" type="number" value={funding} onChange={(e) => setFunding(e.target.value)} title="Prize funding %" />
          <button className="btn-primary" onClick={createDraw}>Create monthly draw</button>
        </div>
        <p className="text-xs text-slate-500">“Scores” mode: saved rolling-5 golf scores ARE the draw — highest total wins (Tier 5 gold / Tier 4 silver / Tier 3 bronze, ties share). No lottery numbers. Legacy lottery modes kept for old draws only.</p>
      </div>
      <div className="card text-sm space-y-2">
        <p className="font-bold">Eligible entries preview — saved golf scores ({entryPreview.length})</p>
        {entryPreview.length === 0 ? <p className="text-slate-400">No eligible subscribers — new registrations appear in the table below with the reason. Ask them to complete payment.</p> : (
          <table className="table"><thead><tr><th>Subscriber</th><th>Saved scores (newest 5)</th><th>Total</th><th>Best</th></tr></thead>
            <tbody>{entryPreview.map((e) => (
              <tr key={e.userId}>
                <td>{e.email}</td>
                <td>{e.scores.length === 0 ? <span className="text-slate-400">no scores — cannot win</span> : e.scores.map((s) => `${s.stableford}@${s.score_date}`).join(', ')}</td>
                <td className="font-mono font-bold">{e.scores.length === 0 ? '—' : e.total}</td>
                <td className="font-mono">{e.scores.length === 0 ? '—' : e.best}</td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
      <div className="card text-sm space-y-2">
        <p className="font-bold">All other users — saved scores but NOT in draw ({ineligible.length})</p>
        <p className="text-xs text-slate-500">Their scores ARE saved and visible here — draws only use scores of active, unexpired subscriptions.</p>
        {ineligible.length === 0 ? <p className="text-slate-400">Everyone is eligible.</p> : (
          <table className="table"><thead><tr><th>Subscriber</th><th>Saved scores</th><th>Why excluded</th></tr></thead>
            <tbody>{ineligible.map((r) => (
              <tr key={r.user.id}>
                <td>{r.user.email}</td>
                <td>{r.scores.length === 0 ? <span className="text-slate-400">no scores yet</span> : r.scores.map((s) => `${s.stableford}@${s.score_date}`).join(', ')}</td>
                <td className="text-gold">{r.reason}</td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
      {db.draws.slice().reverse().map((d) => (
        <div key={d.id} className="card text-sm space-y-2">
          <p className="font-bold">{d.label} <span className="badge bg-white/10 ml-1">{d.mode}</span> <span className="badge bg-mint/15 text-mint ml-1">{d.status}</span></p>
          {d.mode === 'scores' ? (
            <p className="text-slate-400">Score-direct draw — winners chosen from saved golf-score totals only (no lottery numbers).</p>
          ) : (
            d.winning && <p>Winning: <b>{d.winning.join(' – ')}</b></p>
          )}
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
