import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function CharityDetail() {
  const { id } = useParams();
  const { db } = useAuth();
  const c = db.charities.find((x) => x.id === id);
  if (!c) return <div className="card">Charity not found. <Link className="underline" to="/charities">Back</Link></div>;
  const given = db.contributions.filter((x) => x.charityId === c.id).reduce((a, x) => a + x.amount, 0);
  return (
    <div className="space-y-6">
      <img src={c.image} alt={c.name} className="rounded-2xl w-full h-80 lg:h-96 object-cover" />
      <h1 className="text-3xl font-extrabold">{c.name}</h1>
      <p className="text-slate-300 text-base max-w-3xl">{c.description}</p>
      <div className="grid sm:grid-cols-2 gap-4">
      <div className="card text-sm"><p className="font-bold text-white mb-1">Upcoming events</p><p className="text-slate-300">{c.events || '—'}</p></div>
      <div className="card text-sm"><p className="font-bold text-white">Impact so far</p><p className="text-mint text-2xl font-extrabold">₹{((c.raised || 0) + given).toLocaleString('en-IN')}</p></div>
      </div>
      <Link to="/signup" className="btn-primary">Support this charity — Subscribe</Link>
    </div>
  );
}
