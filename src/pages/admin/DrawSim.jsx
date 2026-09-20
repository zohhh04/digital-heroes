import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DrawSim() {
  const { id } = useParams();
  const { db } = useAuth();
  const d = db.draws.find((x) => x.id === id);
  if (!d) return <div className="card">Draw not found.</div>;
  const pool = db.pools.find((p) => p.drawId === id) || d.simPool;
  const entries = db.entries.filter((e) => e.drawId === id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Draw inspection — {d.label}</h1>
      <div className="card text-sm space-y-1">
        <p>Mode: <b>{d.mode}</b> · Status: <b>{d.status}</b></p>
        <p>Winning: <b>{(d.winning || []).join(', ') || '—'}</b></p>
        {pool && <p>Pool ₹{pool.total.toLocaleString('en-IN')} (5: ₹{pool.tiers[5]} · 4: ₹{pool.tiers[4]} · 3: ₹{pool.tiers[3]})</p>}
        {d.simGrouped && <p className="text-slate-400">Simulated: 5×{d.simGrouped[5].length} 4×{d.simGrouped[4].length} 3×{d.simGrouped[3].length}</p>}
      </div>
      <div className="card"><table className="table text-sm"><thead><tr><th>Subscriber</th><th>Entry</th><th>Matches</th><th>Tier</th></tr></thead>
        <tbody>{entries.map((e) => {
          const u = db.users.find((x) => x.id === e.userId);
          return <tr key={e.id}><td>{u?.email}</td><td>{e.numbers.join(', ')}</td><td>{e.matches}</td><td>{e.tier || '—'}</td></tr>;
        })}</tbody></table>
        {entries.length === 0 && <p className="text-sm text-slate-400 mt-2">No live entries yet (simulation does not create payout obligations).</p>}</div>
      <Link className="btn-ghost" to="/admin/draws">Back to draws</Link>
    </div>
  );
}
