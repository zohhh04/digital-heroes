import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProofUpload() {
  const { id } = useParams();
  const { db, setDb, user } = useAuth();
  const [err, setErr] = useState('');
  const w = db.winners.find((x) => x.id === id && x.userId === user.id);
  if (!w) return <div className="card">Record not found. <Link className="underline" to="/dashboard/winnings">Back</Link></div>;
  function onFile(e) {
    setErr('');
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) return setErr('Max 3MB (demo limit).');
    const reader = new FileReader();
    reader.onload = () => setDb((d) => ({
      ...d, winners: d.winners.map((x) => x.id === w.id ? { ...x, proofUrl: reader.result, verify: 'pending' } : x),
    }));
    reader.readAsDataURL(f);
  }
  return (
    <div className="max-w-xl card space-y-4">
      <h1 className="text-2xl font-extrabold">Winner proof — Tier {w.tier}</h1>
      <p className="text-sm text-slate-400">Upload a screenshot of your scores from the golf platform. Admin reviews → approve/reject → payout Pending → Paid.</p>
      {err && <p className="text-sm text-rose">{err}</p>}
      <input type="file" accept="image/*" onChange={onFile} className="text-sm" />
      {w.proofUrl && <img src={w.proofUrl} alt="proof" className="rounded-xl max-h-72 object-contain bg-ink" />}
      <p className="text-sm">Status: <b>{w.verify}</b> {w.reviewerNote && <span className="text-slate-400">— {w.reviewerNote}</span>}</p>
      <Link className="btn-ghost" to="/dashboard/winnings">Back to winnings</Link>
    </div>
  );
}
