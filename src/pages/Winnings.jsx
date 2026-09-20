import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Winnings() {
  const { db, user } = useAuth();
  const mine = db.winners.filter((w) => w.userId === user.id);
  const total = mine.reduce((a, w) => a + (w.amount || 0), 0);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Winnings <span className="text-mint text-xl">₹{total.toLocaleString('en-IN')}</span></h1>
      {mine.length === 0 && <div className="card text-sm text-slate-400">No wins yet. Keep recording scores — draws run monthly.</div>}
      {mine.map((w) => (
        <div key={w.id} className="card flex flex-wrap items-center gap-3">
          <div><p className="font-bold">Tier {w.tier} · ₹{w.amount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-400">verify: {w.verify} · payout: {w.payout}</p></div>
          <Link className="btn-ghost ml-auto text-sm" to={`/dashboard/winnings/${w.id}/proof`}>{w.proofUrl ? 'View / re-upload proof' : 'Upload proof'}</Link>
        </div>
      ))}
    </div>
  );
}
