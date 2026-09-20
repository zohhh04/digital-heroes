import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Charities() {
  const { db } = useAuth();
  const [q, setQ] = useState('');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const list = db.charities.filter((c) => c.active)
    .filter((c) => (!onlyFeatured || c.featured) && (c.name + c.description).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Charity directory</h1>
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-sm" placeholder="Search charities…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} /> Featured only</label>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        {list.map((c) => (
          <Link key={c.id} to={`/charities/${c.id}`} className="card hover:border-accent/60 transition">
            <img src={c.image} alt="" className="rounded-xl h-52 w-full object-cover" loading="lazy" />
            <p className="font-bold mt-3">{c.name} {c.featured && <span className="badge bg-gold/15 text-gold ml-1">Featured</span>}</p>
            <p className="text-sm text-slate-400">{c.description}</p>
          </Link>
        ))}
      </div>
      {list.length === 0 && <div className="card text-sm text-slate-400">No charities match.</div>}
    </div>
  );
}
