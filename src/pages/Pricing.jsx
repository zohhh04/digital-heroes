import { Link } from 'react-router-dom';
import { PLANS } from '../lib/constants.js';

export default function Pricing() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Subscription plans</h1>
      <p className="text-slate-400 text-sm max-w-2xl">Stripe test mode at checkout (mock in this demo; webhook-equivalent activates the subscription server-side — never from a success-page redirect alone).</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {PLANS.map((p) => (
          <div key={p.id} className="card">
            <p className="font-bold">{p.name}</p>
            <p className="text-4xl font-extrabold mt-1">₹{p.price.toLocaleString('en-IN')}<span className="text-sm font-normal text-slate-400"> /{p.interval}</span></p>
            <ul className="text-sm text-slate-300 mt-3 space-y-1">
              <li>• Score tracking (5-score rolling)</li><li>• Monthly draw entries</li><li>• Charity giving (min 10%)</li><li>• Winner verification & payouts</li>
            </ul>
            <Link to="/signup" className="btn-primary mt-4">Register to subscribe {p.interval}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
