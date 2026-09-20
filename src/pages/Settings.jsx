import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Bell, Palette, Lock, Trash2, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { planById } from '../lib/db.js';

export default function Settings() {
  const { user, db, setDb, activeSubscription, resetAll } = useAuth();
  const sub = activeSubscription();
  const plan = user.planId ? planById(user.planId) : null;
  const charity = db.charities.find((c) => c.id === user.charityId);
  const initial = (user.name || '?').trim().charAt(0).toUpperCase();

  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState('');
  const [notif, setNotif] = useState(() => JSON.parse(localStorage.getItem('dh_notif') || '{"draws":true,"wins":true,"charity":false}'));
  const [msg, setMsg] = useState('');

  function saveProfile(e) {
    e.preventDefault();
    if (!name.trim()) return setMsg('Name cannot be empty.');
    setDb((d) => ({ ...d, users: d.users.map((u) => u.id === user.id ? { ...u, name: name.trim() } : u) }));
    setMsg('✅ Profile saved.');
  }
  function changePassword(e) {
    e.preventDefault();
    if (pw.length < 6) return setMsg('Password must be at least 6 characters.');
    setDb((d) => ({ ...d, users: d.users.map((u) => u.id === user.id ? { ...u, pass: pw } : u) }));
    setPw(''); setMsg('✅ Password updated.');
  }
  function toggleNotif(k) {
    const n = { ...notif, [k]: !notif[k] };
    setNotif(n); localStorage.setItem('dh_notif', JSON.stringify(n));
    setMsg('✅ Notification preference saved.');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Settings</h1>
      {msg && <p className="card text-sm border-mint/40">{msg}</p>}

      {/* Profile hero */}
      <div className="card flex items-center gap-4">
        <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-mint grid place-items-center text-2xl font-extrabold text-white shadow-lg">{initial}</span>
        <div className="flex-1">
          <p className="font-extrabold text-lg flex items-center gap-2">{user.name} {sub && <span className="badge bg-mint/15 text-mint"><BadgeCheck size={13} /> Active</span>}</p>
          <p className="text-sm text-slate-400">{user.email} · {user.role} · member since {new Date(user.createdAt).toLocaleDateString()}</p>
          <p className="text-sm text-slate-400 mt-0.5">Plan: <b className="text-white">{plan?.name || 'None'}</b> · Charity: <b className="text-white">{charity?.name || '—'} ({user.contribPct}%)</b></p>
        </div>
        <Link to="/dashboard/subscription" className="btn-ghost text-sm">Manage plan</Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Edit profile */}
        <form onSubmit={saveProfile} className="card space-y-3">
          <p className="font-bold flex items-center gap-2"><User size={16} /> Edit profile</p>
          <div><label className="label">Full name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">Email (cannot change in demo)</label><input className="input opacity-60" value={user.email} disabled /></div>
          <button className="btn-primary w-full">Save profile</button>
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className="card space-y-3">
          <p className="font-bold flex items-center gap-2"><Lock size={16} /> Change password</p>
          <div><label className="label">New password (min 6 chars)</label><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" /></div>
          <button className="btn-ghost w-full">Update password</button>
          <p className="text-xs text-slate-500">Stored locally in this demo; hashed in production (Supabase Auth).</p>
        </form>
      </div>

      {/* Appearance */}
      <div className="card space-y-2">
        <p className="font-bold flex items-center gap-2"><Palette size={16} /> Appearance</p>
        <p className="text-sm text-slate-400">Switch <b>Dark / Light</b> theme anytime with the Sun/Moon button in the top header. Your choice is remembered on this device.</p>
      </div>

      {/* Notifications */}
      <div className="card space-y-2">
        <p className="font-bold flex items-center gap-2"><Bell size={16} /> Notifications (demo)</p>
        {[['draws', 'Monthly draw results'], ['wins', 'When I win a prize'], ['charity', 'Charity impact updates']].map(([k, label]) => (
          <label key={k} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
            {label}
            <button type="button" onClick={() => toggleNotif(k)} className={`w-11 h-6 rounded-full transition ${notif[k] ? 'bg-mint' : 'bg-white/15'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition ml-0.5 ${notif[k] ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        ))}
      </div>

      {/* Danger zone */}
      <div className="card border-rose/30 space-y-2">
        <p className="font-bold flex items-center gap-2 text-rose"><Trash2 size={16} /> Danger zone</p>
        <p className="text-sm text-slate-400">Reset all demo data (users, scores, draws, winners) back to fresh evaluator state.</p>
        <button className="btn-ghost text-sm text-rose" onClick={() => { if (confirm('Reset all demo data?')) { resetAll(); window.location.href = '/'; } }}>Reset demo data</button>
      </div>
    </div>
  );
}
