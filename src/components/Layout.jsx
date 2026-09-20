import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Trophy, Heart, LogOut, LayoutDashboard, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function linkCls({ isActive }) { return 'navlink' + (isActive ? ' navlink-active' : ''); }

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('dh_theme') || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('dh_theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

function ProfileChip({ user, isAdmin, onLogout }) {
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="hidden sm:flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full border border-white/10 bg-white/5">
      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent via-[#9d7bff] to-mint grid place-items-center text-sm font-extrabold text-white shadow">
        {initial}
      </span>
      <span className="leading-tight">
        <span className="flex items-center gap-1 text-sm font-semibold">
          {isAdmin ? <ShieldCheck size={13} className="text-gold" /> : <Heart size={13} className="text-mint" />}
          {user.name}
        </span>
        <span className="block text-[11px] text-slate-400 capitalize">{user.role} · {user.email}</span>
      </span>
      <button
        onClick={onLogout}
        title="Logout"
        className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-rose/20 hover:text-rose px-3 py-1.5 text-xs font-semibold transition"
      >
        <LogOut size={13} /> Logout
      </button>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const doLogout = () => { logout(); nav('/'); };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-mint grid place-items-center"><Trophy size={18} /></span>
            Digital Heroes
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <NavLink to="/how-it-works" className={linkCls}>How it works</NavLink>
            <NavLink to="/charities" className={linkCls}>Charities</NavLink>
            {user && !isAdmin && <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>}
            {isAdmin && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className="btn-ghost !px-3">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden lg:inline text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            {!user ? (<>
              <Link className="btn-ghost" to="/login">Login</Link>
              <Link className="btn-primary" to="/signup">Join / Subscribe</Link>
            </>) : (<>
              <ProfileChip user={user} isAdmin={isAdmin} onLogout={doLogout} />
              {/* mobile fallback */}
              <button className="sm:hidden btn-ghost" onClick={doLogout}><LogOut size={15} /></button>
            </>)}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 fade-in">{children}</main>
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-8 grid sm:grid-cols-4 gap-6 text-sm text-slate-400">
          <div><p className="text-white font-bold mb-2">Digital Heroes</p><p>Play golf. Fund causes. Win monthly draws.</p></div>
          <div><p className="text-white font-bold mb-2">Explore</p><Link className="block hover:text-white" to="/charities">Charities</Link><Link className="block hover:text-white" to="/how-it-works">How winning works</Link><Link className="block hover:text-white" to="/signup">Join</Link></div>
          <div><p className="text-white font-bold mb-2">Account</p>{isAdmin ? <Link className="block hover:text-white" to="/admin">Admin panel</Link> : <Link className="block hover:text-white" to="/dashboard"><span className="inline-flex items-center gap-1"><LayoutDashboard size={13} /> Subscriber dashboard</span></Link>}</div>
          <div><p className="text-white font-bold mb-2">Fine print</p><p>Demo build. Winning is never guaranteed. 18+ play responsibly.</p><p className="mt-1">Terms · Privacy · Contact (placeholder)</p></div>
        </div>
      </footer>
    </div>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div className="card"><p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}</div>
  );
}
export function Empty({ text }) { return <div className="card text-slate-400 text-sm">{text}</div>; }
