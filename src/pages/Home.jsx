import { Link } from 'react-router-dom';
import { Trophy, Heart, Target, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { PLANS } from '../lib/constants.js';

export default function Home() {
  const { db } = useAuth();
  const featured = db.charities.filter((c) => c.featured && c.active);
  const totalRaised = db.contributions.reduce((a, c) => a + c.amount, 0) + db.charities.reduce((a, c) => a + (c.raised || 0), 0);
  const members = db.users.filter((u) => u.role === 'subscriber').length;
  return (
    <div className="space-y-10">
      <section className="card overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-mint/20 pointer-events-none" />
        <p className="badge bg-mint/15 text-mint mb-3"><Heart size={13} /> Charity-first golf platform</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">Play with purpose.<br />Give every round. <span className="text-gold">Win monthly.</span></h1>
        <p className="text-slate-300 mt-4 max-w-2xl">Record Stableford scores, enter monthly 5-number draws, and send at least 10% of your subscription to a charity you choose. No fairways-and-plaid clichés — just impact, motion, and modern play.</p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link className="btn-primary" to="/signup">Join Digital Heroes</Link>
          <Link className="btn-ghost" to="/charities">Explore charities</Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-4 gap-4">
        {[['Subscribe', 'Monthly or yearly plan, Stripe test checkout.'], ['Record scores', 'Last 5 Stableford scores (1–45), one per date.'], ['Enter draws', 'Monthly 3 / 4 / 5-number matches.'], ['Support charity', 'Min 10% of your fee, more if you like.']].map(([t, d], i) => (
          <div key={t} className="card"><p className="text-gold font-extrabold">0{i + 1}</p><p className="font-bold mt-1">{t}</p><p className="text-sm text-slate-400 mt-1">{d}</p></div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-extrabold mb-3 flex items-center gap-2"><Sparkles size={20} /> Charity spotlight</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {featured.map((c) => (
            <Link key={c.id} to={`/charities/${c.id}`} className="card hover:border-accent/60 transition">
              <img src={c.image} alt={c.name} className="rounded-xl h-44 w-full object-cover" loading="lazy" />
              <p className="font-bold mt-3">{c.name}</p><p className="text-sm text-slate-400">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-extrabold flex items-center gap-2"><Trophy size={20} /> Prize draws, explained honestly</h2>
        <ul className="mt-3 text-sm text-slate-300 space-y-1.5">
          <li>• Monthly draw · 5-number jackpot (40%), 4-match (35%), 3-match (25%).</li>
          <li>• Same-tier winners split that tier equally. Unclaimed jackpot rolls over.</li>
          <li>• Admins can simulate before publishing. Winning is <b>not guaranteed</b>.</li>
        </ul>
        <Link to="/how-it-works" className="btn-ghost mt-4">How winning works</Link>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">Total impact (incl. demo base)</p><p className="text-3xl font-extrabold text-mint">₹{totalRaised.toLocaleString('en-IN')}</p></div>
        <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">Members</p><p className="text-3xl font-extrabold">{members}</p></div>
        <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">Causes</p><p className="text-3xl font-extrabold">{db.charities.filter((c) => c.active).length}</p></div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold mb-3 flex items-center gap-2"><Target size={20} /> Plans</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLANS.map((p) => (
            <div key={p.id} className="card"><p className="font-bold">{p.name}</p>
              <p className="text-3xl font-extrabold mt-1">₹{p.price.toLocaleString('en-IN')}<span className="text-sm font-normal text-slate-400"> /{p.interval}</span></p>
              <p className="text-sm text-slate-400 mt-1">{p.blurb}</p>
              <Link to="/signup" className="btn-primary mt-4">Choose {p.interval}</Link></div>
          ))}
        </div>
      </section>
    </div>
  );
}
