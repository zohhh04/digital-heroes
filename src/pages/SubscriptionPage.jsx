import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { PLANS } from '../lib/constants.js';
import { planById, uid } from '../lib/db.js';
import { charityAmount, validateContributionPct } from '../lib/engine.js';

export default function SubscriptionPage() {
  const { user, db, setDb, activeSubscription } = useAuth();
  const sub = activeSubscription();
  const plan = user.planId ? planById(user.planId) : null;
  const [planId, setPlanId] = useState(user.planId || 'monthly');
  const [charityId, setCharityId] = useState(user.charityId || db.charities[0]?.id || '');
  const [pct, setPct] = useState(user.contribPct || 10);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const selectedPlan = planById(planId);

  function cancel() {
    if (!sub) return;
    setDb((d) => ({ ...d, subscriptions: d.subscriptions.map((s) => s.id === sub.id ? { ...s, status: 'cancelled' } : s) }));
  }
  function activate() {
    setErr(''); setMsg('');
    const pctErr = validateContributionPct(pct);
    if (pctErr) return setErr(pctErr);
    if (!charityId) return setErr('Please choose a charity recipient.');
    const p = planById(planId);
    if (!p) return setErr('Please choose a plan.');
    const renewsAt = new Date(); renewsAt.setDate(renewsAt.getDate() + (planId === 'yearly' ? 365 : 30));
    const subId = uid('sub');
    setDb((d) => ({
      ...d,
      users: d.users.map((u) => u.id === user.id ? { ...u, planId, charityId, contribPct: Number(pct) } : u),
      subscriptions: [...d.subscriptions, { id: subId, userId: user.id, planId, status: 'active', amount: p.price, renewsAt: renewsAt.toISOString(), createdAt: new Date().toISOString(), provider: 'stripe_test_mock:subscribe' }],
      contributions: [...d.contributions, { id: uid('cc'), userId: user.id, charityId, amount: charityAmount(p.price, Number(pct)), pct: Number(pct), source: 'subscription ' + subId, at: new Date().toISOString() }],
    }));
    setMsg(`Subscribed to ${p.name} — ₹${charityAmount(p.price, Number(pct)).toLocaleString('en-IN')} goes to charity.`);
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Subscription</h1>
      <div className="card text-sm space-y-1">
        <p>Status: <b>{sub ? 'Active' : 'Inactive / lapsed'}</b></p>
        <p>Plan: <b>{plan?.name || '—'}</b></p>
        <p>Renews: <b>{sub ? new Date(sub.renewsAt).toLocaleDateString() : '—'}</b></p>
        {sub && <button onClick={cancel} className="btn-ghost mt-2 text-sm">Cancel subscription</button>}
      </div>
      <div className="card space-y-3">
        <p className="font-bold">Choose plan & charity (Stripe test mock)</p>
        {err && <p className="text-sm text-rose bg-rose/10 border border-rose/30 rounded-xl px-3 py-2">{err}</p>}
        {msg && <p className="text-sm border border-mint/40 rounded-xl px-3 py-2">{msg}</p>}
        <div><label className="label">Plan</label>
          <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price.toLocaleString('en-IN')}/{p.interval}</option>)}
          </select></div>
        <div><label className="label">Charity recipient</label>
          <select className="input" value={charityId} onChange={(e) => setCharityId(e.target.value)}>
            {db.charities.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label">Charity contribution % (min 10)</label>
          <input className="input" type="number" min={10} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">≈ ₹{selectedPlan ? charityAmount(selectedPlan.price, Number(pct) || 0).toLocaleString('en-IN') : 0} of ₹{selectedPlan?.price.toLocaleString('en-IN')} goes to charity.</p></div>
        <button className="btn-primary" onClick={activate}>{sub ? 'Switch / renew now' : 'Pay & activate'} {selectedPlan ? `₹${selectedPlan.price.toLocaleString('en-IN')}` : ''}</button>
      </div>
      <div className="card text-sm"><p className="font-bold mb-1">History</p>
        {db.subscriptions.filter((s) => s.userId === user.id).map((s) => <p key={s.id} className="text-slate-400">{s.planId} · ₹{s.amount} · {s.status} · renews {new Date(s.renewsAt).toLocaleDateString()}</p>)}
        {db.subscriptions.filter((s) => s.userId === user.id).length === 0 && <p className="text-slate-500">No subscription yet — choose a plan above.</p>}</div>
    </div>
  );
}
