import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DrawSim() {
  const { id } = useParams();
  const { db } = useAuth();
  const d = db.draws.find((x) => x.id === id);
  if (!d) return <div className="card">Draw not found.</div>;
  const pool = db.pools.find((p) => p.drawId === id) || d.simPool;
  const liveEntries = db.entries.filter((e) => e.drawId === id);
  const simEntries = d.simEntries || [];
  const rows = liveEntries.length > 0 ? liveEntries : simEntries;
  const withScores = rows.map((e) => {
    const retained = db.scores.filter((x) => x.userId === e.userId).sort((a, b) => (a.score_date < b.score_date ? 1 : -1)).slice(0, 5);
    // Prefer the score snapshot taken at draw time (sim/live), fall back to current scores.
    const scores = e.scores || retained;
    const total = e.total ?? scores.reduce((a, s) => a + Number(s.stableford || 0), 0);
    const best = e.best ?? (scores.length ? Math.max(...scores.map((s) => Number(s.stableford))) : 0);
    return { ...e, scores, total, best };
  }).sort((a, b) => (b.total - a.total) || (b.best - a.best));
  const isScores = d.mode === 'scores';
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Draw inspection — {d.label}</h1>
      <div className="card text-sm space-y-1">
        <p>Mode: <b>{d.mode}</b> · Status: <b>{d.status}</b></p>
        {isScores ? (
          <p>Winners from <b>saved golf-score totals only</b> — highest total = Tier 5 (gold), next = Tier 4 (silver), next = Tier 3 (bronze). Ties share.</p>
        ) : (
          <p>Winning: <b>{(d.winning || []).join(', ') || '—'}</b></p>
        )}
        {pool && <p>Pool ₹{pool.total.toLocaleString('en-IN')} (5: ₹{pool.tiers[5]} · 4: ₹{pool.tiers[4]} · 3: ₹{pool.tiers[3]})</p>}
        {d.simGrouped && <p className="text-slate-400">Simulated: Tier5 ×{d.simGrouped[5].length} Tier4 ×{d.simGrouped[4].length} Tier3 ×{d.simGrouped[3].length}</p>}
        <p className="text-xs text-slate-500">{isScores ? 'Every row below is a saved subscriber score evaluated for this draw.' : 'Entry numbers are derived from each subscriber’s retained rolling-5 golf scores. Scores column below proves what was taken.'}</p>
      </div>
      <div className="card"><table className="table text-sm"><thead><tr><th>Subscriber</th><th>Saved golf scores used</th><th>Total</th><th>Best</th>{isScores ? null : <th>Entry</th>}<th>Matches</th><th>Tier</th></tr></thead>
        <tbody>{withScores.map((e) => {
          const u = db.users.find((x) => x.id === e.userId);
          return <tr key={e.userId || e.id}><td>{u?.email}</td><td>{(e.scores || []).length === 0 ? <span className="text-slate-400">no scores — cannot win</span> : e.scores.map((s) => `${s.stableford}@${s.score_date}`).join(', ')}</td><td className="font-bold">{e.total}</td><td>{e.best}</td>{isScores ? null : <td>{(e.numbers || []).join(', ')}</td>}<td>{e.matches ?? '—'}</td><td>{e.tier || '—'}</td></tr>;
        })}</tbody></table>
        {withScores.length === 0 && <p className="text-sm text-slate-400 mt-2">No entries yet — run Simulate or Run actual draw first.</p>}</div>
      <Link className="btn-ghost" to="/admin/draws">Back to draws</Link>
    </div>
  );
}
