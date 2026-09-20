import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { Stat } from '../../components/Layout.jsx';

export default function Reports() {
  const { db } = useAuth();
  const poolTotal = db.pools.reduce((a, p) => a + (p.total || 0), 0);
  const charityTotal = db.contributions.reduce((a, c) => a + c.amount, 0);
  const donationTotal = db.donations.reduce((a, d) => a + d.amount, 0);
  const perCharity = db.charities.map((c) => ({ name: c.name.split(' ')[0], total: db.contributions.filter((x) => x.charityId === c.id).reduce((a, x) => a + x.amount, 0) }));
  const perDraw = db.draws.map((d) => ({ name: d.label.slice(0, 12), pool: (db.pools.find((p) => p.drawId === d.id)?.total) || 0 }));
  const activeSubs = db.subscriptions.filter((s) => s.status === 'active');
  const monthlyCount = activeSubs.filter((s) => s.planId === 'monthly').length;
  const yearlyCount = activeSubs.filter((s) => s.planId === 'yearly').length;
  const activeRevenue = activeSubs.reduce((a, s) => a + (s.amount || 0), 0);
  const verifyPending = db.winners.filter((w) => w.verify === 'pending').length;
  const verifyApproved = db.winners.filter((w) => w.verify === 'approved').length;
  const verifyRejected = db.winners.filter((w) => w.verify === 'rejected').length;
  const payoutPaid = db.winners.filter((w) => w.payout === 'paid').length;
  const payoutPending = db.winners.length - payoutPaid;
  const userById = Object.fromEntries(db.users.map((u) => [u.id, u]));
  const drawById = Object.fromEntries(db.draws.map((d) => [d.id, d]));
  const recentWinners = db.winners.slice().reverse().slice(0, 10);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Reports & analytics</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Total users" value={db.users.length} />
        <Stat label="Total prize pool" value={`₹${poolTotal.toLocaleString('en-IN')}`} />
        <Stat label="Charity contributions" value={`₹${(charityTotal + donationTotal).toLocaleString('en-IN')}`} sub={`subs ₹${charityTotal} + direct ₹${donationTotal}`} />
        <Stat label="Draws run" value={db.draws.length} sub={`${db.winners.length} winner records`} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card"><p className="font-bold mb-2 text-sm">Prize pool per draw</p>
          <ResponsiveContainer width="100%" height={220}><BarChart data={perDraw}><XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip /><Bar dataKey="pool" fill="#7C5CFF" /></BarChart></ResponsiveContainer></div>
        <div className="card"><p className="font-bold mb-2 text-sm">Contributions per charity</p>
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={perCharity} dataKey="total" nameKey="name" outerRadius={80} label>{perCharity.map((_, i) => <Cell key={i} fill={['#7C5CFF', '#2DD4A7', '#FFC24B', '#FF5C7A'][i % 4]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card text-sm space-y-1"><p className="font-bold mb-1">Plan mix & revenue (active subs)</p>
          <p className="text-slate-400">Monthly: <b className="text-white">{monthlyCount}</b> · Yearly: <b className="text-white">{yearlyCount}</b></p>
          <p className="text-slate-400">Active revenue: <b className="text-white">₹{activeRevenue.toLocaleString('en-IN')}</b></p>
          <p className="text-slate-400">Cancelled/lapsed records: <b className="text-white">{db.subscriptions.length - activeSubs.length}</b></p></div>
        <div className="card text-sm space-y-1"><p className="font-bold mb-1">Verification & payouts</p>
          <p className="text-slate-400">Proof pending: <b className="text-white">{verifyPending}</b> · approved: <b className="text-white">{verifyApproved}</b> · rejected: <b className="text-white">{verifyRejected}</b></p>
          <p className="text-slate-400">Payout paid: <b className="text-white">{payoutPaid}</b> · pending: <b className="text-white">{payoutPending}</b></p></div>
      </div>
      <div className="card text-sm"><p className="font-bold mb-2">Recent winners (latest 10)</p>
        {recentWinners.length === 0 ? <p className="text-slate-500">No winners yet — run a draw first.</p> :
        <table className="table"><thead><tr><th>Winner</th><th>Draw</th><th>Tier</th><th>Amount</th><th>Verify</th><th>Payout</th></tr></thead>
        <tbody>{recentWinners.map((w) => (
          <tr key={w.id}><td>{userById[w.userId]?.email || w.userId}</td><td>{drawById[w.drawId]?.label || '—'}</td><td>Tier {w.tier}</td><td>₹{(w.amount || 0).toLocaleString('en-IN')}</td><td>{w.verify}</td><td>{w.payout}</td></tr>
        ))}</tbody></table>}</div>
    </div>
  );
}
