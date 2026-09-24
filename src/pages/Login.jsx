import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO_CREDENTIALS } from '../lib/constants.js';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get('email') || '');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const justRegistered = sp.get('registered') === '1';
  function submit(e) {
    e.preventDefault(); setErr('');
    const r = login(email.trim(), password);
    if (!r.ok) return setErr(r.error);
    nav(r.user?.role === 'admin' ? '/admin' : '/dashboard');
  }
  function fill(which) { setEmail(DEMO_CREDENTIALS[which].email); setPassword(DEMO_CREDENTIALS[which].password); }
  return (
    <div className="max-w-md mx-auto card space-y-4">
      <h1 className="text-2xl font-extrabold">Login</h1>
      {justRegistered && <p className="text-sm bg-mint/10 border border-mint/40 rounded-xl px-3 py-2">🎉 Account created! Now <b>login below</b> to enter the website.</p>}
      {err && <p className="text-sm text-rose bg-rose/10 border border-rose/30 rounded-xl px-3 py-2">{err}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn-primary w-full">Login</button>
      </form>
      <div className="text-sm text-slate-400 space-y-1">
        <p className="font-bold text-white">Test credentials (evaluators)</p>
        <p>Subscriber: <code>hero@digitalheroes.test / Hero@123</code> <button className="underline" onClick={() => fill('subscriber')}>fill</button></p>
        <p>Admin: <code>admin@digitalheroes.test / Admin@123</code> <button className="underline" onClick={() => fill('admin')}>fill</button></p>
      </div>
      <p className="text-sm text-slate-400">New here? <Link className="underline" to="/signup">Join / Subscribe</Link></p>
    </div>
  );
}
