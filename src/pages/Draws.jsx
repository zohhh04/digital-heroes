import { useAuth } from '../context/AuthContext.jsx';

export default function Draws() {
  const { db, user } = useAuth();
  const mine = db.entries.filter((e) => e.userId === user.id);
  const pubs = db.draws.filter((d) => d.status === 'published' || d.status === 'closed');
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Draws</h1>
      <div className="card text-sm text-slate-300">You are entered automatically while your subscription is active — one 5-number entry per draw (1–45). Matching tiers: 5/4/3 numbers.</div>
      {pubs.length === 0 && <div className="card text-sm text-slate-400">No published draws yet.</div>}
      {pubs.map((d) => {
        const pool = db.pools.find((p) => p.drawId === d.id);
        const me = mine.find((e) => e.drawId === d.id);
        return (
          <div key={d.id} className="card">
            <p className="font-bold">{d.label} <span className="badge bg-white/10 ml-2">{d.mode}</span> <span className="badge bg-mint/15 text-mint ml-1">{d.status}</span></p>
            <p className="text-sm mt-1">Winning: <b>{(d.winning || []).join(' – ')}</b> · Pool ₹{(pool?.total || 0).toLocaleString('en-IN')} (5: ₹{pool?.tiers?.[5]} · 4: ₹{pool?.tiers?.[4]} · 3: ₹{pool?.tiers?.[3]})</p>
            <p className="text-sm text-slate-400">Your entry: {me ? <b className="text-white">{me.numbers.join(', ')} → {me.matches} matches{me.tier ? ` (Tier ${me.tier})` : ''}</b> : '—'}</p>
          </div>
        );
      })}
    </div>
  );
}
