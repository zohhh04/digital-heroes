import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { user, signup } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function submitNew(e) {
    e.preventDefault(); setErr('');
    if (!f.name.trim() || !f.email.trim() || !f.password) return setErr('Name, email and password are required.');
    if (f.password.length < 6) return setErr('Password must be at least 6 characters.');
    const r = signup({ name: f.name.trim(), email: f.email.trim(), password: f.password });
    if (!r.ok) return setErr('DUPLICATE');
    nav('/login?registered=1');
  }

  if (user) {
    return (
      <div className="max-w-xl mx-auto card space-y-4">
        <h1 className="text-2xl font-extrabold">You already have an account</h1>
        <p className="text-sm text-slate-400">Logged in as <b className="text-white">{user.name} ({user.email})</b>. Pick your plan and charity on the Subscription page.</p>
        <Link className="btn-primary w-full" to="/dashboard/subscription">Go to Subscription →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto card space-y-4">
      <h1 className="text-2xl font-extrabold">Join Digital Heroes</h1>
      {err === 'DUPLICATE' ? (
        <div className="text-sm bg-gold/10 border border-gold/40 rounded-xl px-3 py-2 space-y-1">
          <p>This email is <b>already registered</b> — you don't need a new account.</p>
          <p><Link className="underline font-semibold" to={`/login?email=${encodeURIComponent(f.email)}`}>Click here to login instead →</Link></p>
        </div>
      ) : err ? (
        <p className="text-sm text-rose bg-rose/10 border border-rose/30 rounded-xl px-3 py-2">{err}</p>
      ) : null}
      <form onSubmit={submitNew} className="space-y-3">
        <div><label className="label">Full name</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 6 characters" /></div>
        <button className="btn-primary w-full">Register</button>
        <p className="text-xs text-slate-500 text-center">After registering, login — then choose your plan + charity on the Subscription page.</p>
      </form>
      <p className="text-sm text-slate-400">Have an account? <Link className="underline" to="/login">Login</Link></p>
    </div>
  );
}
