import { useAuth } from '../../context/AuthContext.jsx';

export default function Subscriptions() {
  const { db, setDb } = useAuth();
  function setStatus(id, status) { setDb((d) => ({ ...d, subscriptions: d.subscriptions.map((s) => s.id === id ? { ...s, status } : s) })); }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Subscriptions</h1>
      <p className="text-xs text-slate-400 max-w-2xl">Subscriptions are created only by the payment webhook-equivalent after a <b>succeeded</b> payment — never by a button. Admins can cancel/lapse, but cannot manually activate without a payment.</p>
      <div className="card"><table className="table text-sm"><thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Payment</th><th>Renews</th><th></th></tr></thead>
        <tbody>{db.subscriptions.map((s) => {
          const u = db.users.find((x) => x.id === s.userId);
          return <tr key={s.id}><td>{u?.email}</td><td>{s.planId}</td><td>₹{s.amount}</td><td>{s.status}</td><td className="font-mono text-xs">{s.paymentId || '—'}</td><td>{new Date(s.renewsAt).toLocaleDateString()}</td>
            <td className="space-x-2 text-xs"><button className="underline" onClick={() => setStatus(s.id, 'cancelled')}>cancel</button><button className="underline text-rose" onClick={() => setStatus(s.id, 'lapsed')}>lapse</button></td></tr>;
        })}</tbody></table></div>
      <div className="card text-sm"><p className="font-bold mb-1">Payments</p>
        <table className="table text-sm"><thead><tr><th>ID</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Card</th></tr></thead>
        <tbody>{(db.payments || []).slice().reverse().map((p) => {
          const u = db.users.find((x) => x.id === p.userId);
          return <tr key={p.id}><td className="font-mono text-xs">{p.id}</td><td>{u?.email}</td><td>{p.planId}</td><td>₹{p.amount}</td><td>{p.status}</td><td>{p.cardLast4 ? `•••• ${p.cardLast4}` : '—'}</td></tr>;
        })}</tbody></table></div>
    </div>
  );
}
