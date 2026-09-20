import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Stat } from '../components/Layout.jsx';
import { planById } from '../lib/db.js';

export default function Dashboard() {
  const { user, db, activeSubscription } = useAuth();
  if (!user) return <div className="card">Please <Link className="underline" to="/login">login</Link>.</div>;
  const sub = activeSubscription();
  const scores = db.scores.filter((s) => s.userId === user.id).sort((a, b) => (a.score_date < b.score_date ? 1 : -1));
  const charity = db.charities.find((c) => c.id === user.charityId);
  const myWins = db.winners.filter((w) => w.userId === user.id);
  const totalWon = myWins.reduce((a, w) => a + (w.amount || 0), 0);
  const upcoming = db.draws.filter((d) => d.status !== 'closed').slice(-3);
  const plan = user.planId ? planById(user.planId) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Namaste, {user.name} 🏌️</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Subscription" value={sub ? 'Active' : 'Inactive'} sub={sub ? `${plan?.name} · renews ${new Date(sub.renewsAt).toLocaleDateString()}` : 'Subscribe to unlock draws'} />
        <Stat label="Scores kept" value={`${scores.length}/5`} sub={scores[0] ? `Latest: ${scores[0].stableford} on ${scores[0].score_date}` : 'Add your first score'} />
        <Stat label="Charity" value={`${user.contribPct}%`} sub={charity?.name || '—'} />
        <Stat label="Total winnings" value={`₹${totalWon.toLocaleString('en-IN')}`} sub={`${myWins.length} wins`} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="font-bold mb-2">Quick actions</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="btn-primary" to="/dashboard/scores">Enter score</Link>
            <Link className="btn-ghost" to="/dashboard/draws">View draws</Link>
            <Link className="btn-ghost" to="/dashboard/winnings">Winnings & proof</Link>
            <Link className="btn-ghost" to="/dashboard/subscription">Manage subscription</Link>
          </div>
        </div>
        <div className="card">
          <p className="font-bold mb-2">Upcoming draws</p>
          {upcoming.length === 0 ? <p className="text-sm text-slate-400">No draws yet — check back after the admin creates one.</p> :
            upcoming.map((d) => <p key={d.id} className="text-sm">• {d.label} — <span className="text-slate-400">{d.status}</span></p>)}
        </div>
      </div>
      {!sub && <div className="card border-gold/40"><p className="text-sm">Your subscription is <b>inactive/lapsed</b>. Draws, score-linked entries and winnings are locked until you renew. <Link className="underline" to="/dashboard/subscription">Renew now</Link></p></div>}
    </div>
  );
}
