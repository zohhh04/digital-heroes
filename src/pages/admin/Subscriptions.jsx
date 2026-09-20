import { useAuth } from '../../context/AuthContext.jsx';

export default function Subscriptions() {
  const { db, setDb } = useAuth();
  function setStatus(id, status) { setDb((d) => ({ ...d, subscriptions: d.subscriptions.map((s) => s.id === id ? { ...s, status } : s) })); }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Subscriptions</h1>
      <div className="card"><table className="table text-sm"><thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Renews</th><th></th></tr></thead>
        <tbody>{db.subscriptions.map((s) => {
          const u = db.users.find((x) => x.id === s.userId);
          return <tr key={s.id}><td>{u?.email}</td><td>{s.planId}</td><td>₹{s.amount}</td><td>{s.status}</td><td>{new Date(s.renewsAt).toLocaleDateString()}</td>
            <td className="space-x-2 text-xs"><button className="underline" onClick={() => setStatus(s.id, 'active')}>activate</button><button className="underline" onClick={() => setStatus(s.id, 'cancelled')}>cancel</button><button className="underline text-rose" onClick={() => setStatus(s.id, 'lapsed')}>lapse</button></td></tr>;
        })}</tbody></table></div>
    </div>
  );
}
