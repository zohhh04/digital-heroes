import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { rollScores } from '../../lib/engine.js';

export default function Users() {
  const { db, setDb } = useAuth();
  const [q, setQ] = useState('');
  const list = db.users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  function setRole(id, role) { setDb((d) => ({ ...d, users: d.users.map((u) => u.id === id ? { ...u, role } : u) })); }
  function delUser(id) {
    const u = db.users.find((x) => x.id === id);
    if (!u) return;
    if (u.email === 'admin@digitalheroes.test' || u.email === 'hero@digitalheroes.test') return alert('Test accounts cannot be deleted.');
    if (!confirm(`Delete ${u.name} (${u.email}) and all their data?`)) return;
    setDb((d) => ({
      ...d,
      users: d.users.filter((x) => x.id !== id),
      subscriptions: d.subscriptions.filter((x) => x.userId !== id),
      scores: d.scores.filter((x) => x.userId !== id),
      entries: d.entries.filter((x) => x.userId !== id),
      winners: d.winners.filter((x) => x.userId !== id),
      donations: d.donations.filter((x) => x.userId !== id),
      contributions: d.contributions.filter((x) => x.userId !== id),
      sessionUserId: d.sessionUserId === id ? null : d.sessionUserId,
    }));
  }
  function pruneToTestAccounts() {
    const keep = new Set(['admin@digitalheroes.test', 'hero@digitalheroes.test']);
    const keepIds = new Set(db.users.filter((u) => keep.has(u.email.toLowerCase())).map((u) => u.id));
    const removed = db.users.length - keepIds.size;
    if (removed <= 0) return alert('Already clean — only admin + subscriber accounts exist.');
    if (!confirm(`Remove ${removed} extra account(s)? Only admin + subscriber will remain.`)) return;
    setDb((d) => {
      const ids = new Set(d.users.filter((u) => keep.has(u.email.toLowerCase())).map((u) => u.id));
      return {
        ...d,
        users: d.users.filter((u) => ids.has(u.id)),
        subscriptions: d.subscriptions.filter((x) => ids.has(x.userId)),
        scores: d.scores.filter((x) => ids.has(x.userId)),
        entries: d.entries.filter((x) => ids.has(x.userId)),
        winners: d.winners.filter((x) => ids.has(x.userId)),
        donations: d.donations.filter((x) => ids.has(x.userId)),
        contributions: d.contributions.filter((x) => ids.has(x.userId)),
        sessionUserId: ids.has(d.sessionUserId) ? d.sessionUserId : null,
      };
    });
  }
  function delScore(id) { setDb((d) => ({ ...d, scores: d.scores.filter((s) => s.id !== id) })); }
  function addScore(userId, date, val) {
    const mine = db.scores.filter((s) => s.userId === userId).map((s) => ({ score_date: s.score_date, stableford: s.stableford }));
    const r = rollScores(mine, { score_date: date, stableford: Number(val) });
    if (!r.ok) return alert(r.error);
    const merged = [...db.scores.filter((s) => s.userId === userId), { id: 'sc_' + Math.random().toString(36).slice(2, 8), userId, score_date: date, stableford: Number(val) }]
      .sort((a, b) => (a.score_date < b.score_date ? 1 : -1)).slice(0, 5);
    setDb((d) => ({ ...d, scores: [...d.scores.filter((s) => s.userId !== userId), ...merged] }));
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">User management</h1>
      <div className="card text-sm flex flex-wrap items-center gap-2">
        <p className="text-slate-400">Test setup: keep only <b className="text-white">admin@digitalheroes.test</b> + <b className="text-white">hero@digitalheroes.test</b>, delete everything else with its scores/subs/wins.</p>
        <button className="btn-ghost text-xs ml-auto" onClick={pruneToTestAccounts}>Remove all except admin + subscriber</button>
      </div>
      <input className="input max-w-sm" placeholder="Search name/email…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((u) => {
        const scores = db.scores.filter((s) => s.userId === u.id).sort((a, b) => (a.score_date < b.score_date ? 1 : -1));
        return (
          <div key={u.id} className="card text-sm">
            <p className="font-bold">{u.name} <span className="text-slate-400 font-normal">· {u.email} · {u.role} · charity {u.charityId} ({u.contribPct}%)</span></p>
            <div className="flex gap-2 mt-2">
              <button className="btn-ghost text-xs" onClick={() => setRole(u.id, u.role === 'admin' ? 'subscriber' : 'admin')}>Toggle role</button>
              <button className="btn-ghost text-xs" onClick={() => { const d = prompt('Date YYYY-MM-DD', new Date().toISOString().slice(0, 10)); const v = prompt('Score 1-45', '30'); if (d && v) addScore(u.id, d, v); }}>Add score</button>
              <button className="btn-ghost text-xs text-rose" onClick={() => delUser(u.id)}>Delete user</button>
            </div>
            <p className="mt-2 text-slate-400">Scores ({scores.length}/5): {scores.map((s) => `${s.score_date}:${s.stableford}`).join(' · ') || '—'}</p>
            <div className="flex flex-wrap gap-2 mt-1">{scores.map((s) => <button key={s.id} className="underline text-xs text-rose" onClick={() => delScore(s.id)}>del {s.score_date}</button>)}</div>
          </div>
        );
      })}
    </div>
  );
}
