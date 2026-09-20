import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { validateContributionPct, charityAmount } from '../lib/engine.js';
import { planById, uid } from '../lib/db.js';

export default function CharityPref() {
  const { user, db, setDb } = useAuth();
  const [charityId, setCharityId] = useState(user.charityId);
  const [pct, setPct] = useState(user.contribPct);
  const [amt, setAmt] = useState(2500);
  const [msg, setMsg] = useState('');
  function save(e) {
    e.preventDefault(); setMsg('');
    const err = validateContributionPct(pct);
    if (err) return setMsg(err);
    setDb((d) => ({ ...d, users: d.users.map((u) => u.id === user.id ? { ...u, charityId, contribPct: Number(pct) } : u) }));
    setMsg('Saved — at least 10% always goes to charity. Thank you!');
  }
  function donate(e) {
    e.preventDefault();
    if (Number(amt) <= 0) return setMsg('Enter a valid donation amount.');
    setDb((d) => ({ ...d, donations: [...d.donations, { id: uid('dn'), userId: user.id, charityId, amount: Number(amt), at: new Date().toISOString(), status: 'paid_mock' }] }));
    setMsg(`Donated ₹${Number(amt).toLocaleString('en-IN')} (mock receipt).`);
  }
  const plan = user.planId ? planById(user.planId) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Charity giving</h1>
      <form onSubmit={save} className="card space-y-3">
        <div><label className="label">Selected charity</label>
          <select className="input" value={charityId} onChange={(e) => setCharityId(e.target.value)}>
            {db.charities.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label">Contribution % (10–100)</label><input className="input" type="number" min={10} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
          {plan && <p className="text-xs text-slate-400 mt-1">≈ ₹{charityAmount(plan.price, Number(pct) || 0).toLocaleString('en-IN')} of your ₹{plan.price.toLocaleString('en-IN')} {plan.interval} plan.</p>}</div>
        <button className="btn-primary">Save preferences</button>
      </form>
      <form onSubmit={donate} className="card space-y-3">
        <p className="font-bold">Independent donation (not tied to gameplay)</p>
        <div className="flex gap-2"><input className="input" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /><button className="btn-mint">Donate</button></div>
      </form>
      {msg && <p className="text-sm card">{msg}</p>}
    </div>
  );
}
