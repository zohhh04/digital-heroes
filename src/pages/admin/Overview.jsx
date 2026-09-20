import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Stat } from '../../components/Layout.jsx';

export default function AdminOverview() {
  const { db } = useAuth();
  const poolTotal = db.pools.reduce((a, p) => a + (p.total || 0), 0);
  const charityTotal = db.contributions.reduce((a, c) => a + c.amount, 0) + db.donations.reduce((a, d) => a + d.amount, 0);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Admin overview</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Total users" value={db.users.length} />
        <Stat label="Active subs" value={db.subscriptions.filter((s) => s.status === 'active').length} />
        <Stat label="Prize pools" value={`₹${poolTotal.toLocaleString('en-IN')}`} />
        <Stat label="Charity totals" value={`₹${charityTotal.toLocaleString('en-IN')}`} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 text-sm">
        <Link to="/admin/users" className="card hover:border-accent/60"><b>01 · User management</b><p className="text-slate-400">Profiles, scores, subscriptions.</p></Link>
        <Link to="/admin/draws" className="card hover:border-accent/60"><b>02 · Draw management</b><p className="text-slate-400">Random/algorithmic, simulate, publish.</p></Link>
        <Link to="/admin/charities" className="card hover:border-accent/60"><b>03 · Charity management</b><p className="text-slate-400">CRUD + featured + events.</p></Link>
        <Link to="/admin/winners" className="card hover:border-accent/60"><b>04 · Winners</b><p className="text-slate-400">Verify proof, mark payouts.</p></Link>
        <Link to="/admin/reports" className="card hover:border-accent/60"><b>05 · Reports</b><p className="text-slate-400">Users, pools, charity, draws.</p></Link>
      </div>
    </div>
  );
}
