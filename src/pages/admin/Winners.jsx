import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function WinnersAdmin() {
  const { db, setDb } = useAuth();
  const [f, setF] = useState({ draw: 'all', verify: 'all', payout: 'all' });
  const list = db.winners.filter((w) =>
    (f.draw === 'all' || w.drawId === f.draw) && (f.verify === 'all' || w.verify === f.verify) && (f.payout === 'all' || w.payout === f.payout));
  function review(id, verify, note = '') {
    setDb((d) => ({ ...d, winners: d.winners.map((w) => w.id === id ? { ...w, verify, reviewerNote: note } : w) }));
  }
  function markPaid(id) {
    setDb((d) => ({ ...d, winners: d.winners.map((w) => w.id === id ? { ...w, payout: 'paid', paidAt: new Date().toISOString() } : w) }));
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Winner verification & payouts</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <select className="input max-w-[220px]" value={f.draw} onChange={(e) => setF({ ...f, draw: e.target.value })}>
          <option value="all">All draws</option>{db.draws.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select className="input max-w-[160px]" value={f.verify} onChange={(e) => setF({ ...f, verify: e.target.value })}>
          <option value="all">verify: all</option><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option>
        </select>
        <select className="input max-w-[160px]" value={f.payout} onChange={(e) => setF({ ...f, payout: e.target.value })}>
          <option value="all">payout: all</option><option value="pending">pending</option><option value="paid">paid</option>
        </select>
      </div>
      {list.map((w) => {
        const u = db.users.find((x) => x.id === w.userId);
        const d = db.draws.find((x) => x.id === w.drawId);
        return (
          <div key={w.id} className="card text-sm space-y-2">
            <p><b>{u?.name} ({u?.email})</b> · {d?.label} · Tier {w.tier} · <b>₹{w.amount.toLocaleString('en-IN')}</b> · verify <b>{w.verify}</b> · payout <b>{w.payout}</b></p>
            {w.proofUrl ? <img src={w.proofUrl} alt="proof" className="rounded-xl max-h-56 object-contain bg-ink border border-white/10" /> : <p className="text-slate-500">No proof uploaded yet.</p>}
            {w.reviewerNote && <p className="text-slate-400">Note: {w.reviewerNote}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn-mint text-sm" onClick={() => review(w.id, 'approved')}>Approve proof</button>
              <button className="btn-ghost text-sm" onClick={() => { const n = prompt('Rejection reason', 'Scores do not match'); if (n !== null) review(w.id, 'rejected', n); }}>Reject with reason</button>
              <button className="btn-primary text-sm" disabled={w.verify !== 'approved'} title={w.verify !== 'approved' ? 'Approve proof first' : ''} onClick={() => markPaid(w.id)}>Mark payout Paid</button>
            </div>
          </div>
        );
      })}
      {list.length === 0 && <div className="card text-sm text-slate-400">No winners yet — run a draw first.</div>}
    </div>
  );
}
