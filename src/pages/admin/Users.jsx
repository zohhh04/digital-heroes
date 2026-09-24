import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { rollScores } from '../../lib/engine.js';
import { loadDb } from '../../lib/db.js';

export default function Users() {
  const { db, setDb, user: adminUser, cloudStatus, cloudEnabled } = useAuth();
  const [q, setQ] = useState('');
  const fileRef = useRef(null);

  // Newest registrations FIRST so a just-registered subscriber is always on top.
  const filtered = db.users
    .filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (String(a.createdAt || '') < String(b.createdAt || '') ? 1 : -1));

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
      _deleted: {
        ...(d._deleted || {}),
        users: [...((d._deleted || {}).users || []), id],
        scores: [...((d._deleted || {}).scores || []), ...d.scores.filter((s) => s.userId === id).map((s) => s.id)],
        subscriptions: [...((d._deleted || {}).subscriptions || []), ...d.subscriptions.filter((s) => s.userId === id).map((s) => s.id)],
      },
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
  function delScore(id) { setDb((d) => ({ ...d, scores: d.scores.filter((s) => s.id !== id), _deleted: { ...(d._deleted || {}), scores: [...((d._deleted || {}).scores || []), id] } })); }
  function addScore(userId, date, val) {
    const mine = db.scores.filter((s) => s.userId === userId).map((s) => ({ score_date: s.score_date, stableford: s.stableford }));
    const r = rollScores(mine, { score_date: date, stableford: Number(val) });
    if (!r.ok) return alert(r.error);
    const merged = [...db.scores.filter((s) => s.userId === userId), { id: 'sc_' + Math.random().toString(36).slice(2, 8), userId, score_date: date, stableford: Number(val) }]
      .sort((a, b) => (a.score_date < b.score_date ? 1 : -1)).slice(0, 5);
    setDb((d) => ({ ...d, scores: [...d.scores.filter((s) => s.userId !== userId), ...merged] }));
  }
  function refreshFromStorage() {
    try {
      const fresh = loadDb();
      setDb(fresh);
      alert(`Refreshed from this browser storage: ${fresh.users.length} user(s) found.`);
    } catch (e) { alert('Refresh failed: ' + e.message); }
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'digital-heroes-db.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importJson(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.users)) return alert('Invalid file: missing users array.');
        setDb((d) => ({ ...data, sessionUserId: data.users.some((u) => u.id === d.sessionUserId) ? d.sessionUserId : data.sessionUserId || null }));
        alert(`Imported ${data.users.length} user(s). All registered subscribers are now listed below.`);
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">User management — all registered subscribers ({db.users.length})</h1>
      <div className="card text-sm space-y-1">
        <p className="text-slate-400">Logged in as <b className="text-white">{adminUser?.email}</b> · {cloudEnabled ? <span>sync: <b className="text-mint">{cloudStatus}</b> (all devices share users/scores)</span> : <span>data source: <b className="text-gold">this browser only</b> — add Supabase env for cross-device</span>}.</p>
        <p className="text-xs text-slate-500">Every email that registers + logs in on THIS browser appears below (newest first). Different device/browser has separate storage — use Export/Import to move data, or connect Supabase for shared storage.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button className="btn-ghost text-xs" onClick={refreshFromStorage}>Refresh list</button>
          <button className="btn-ghost text-xs" onClick={exportJson}>Export JSON</button>
          <button className="btn-ghost text-xs" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
          <button className="btn-ghost text-xs text-rose ml-auto" onClick={pruneToTestAccounts}>Remove all except admin + subscriber</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-sm" placeholder="Search name/email…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="btn-ghost text-xs" onClick={() => setQ('')}>Clear</button>}
        <p className="text-xs text-slate-400 ml-auto">Showing {filtered.length} of {db.users.length}</p>
      </div>
      {filtered.length === 0 && <div className="card text-sm text-slate-400">No users match “{q}”. <button className="underline" onClick={() => setQ('')}>Clear search</button> to see all {db.users.length} registered users.</div>}
      {filtered.map((u) => {
        const scores = db.scores.filter((s) => s.userId === u.id).sort((a, b) => (a.score_date < b.score_date ? 1 : -1));
        const userSubs = db.subscriptions.filter((s) => s.userId === u.id);
        const active = userSubs.find((s) => s.status === 'active' && new Date(s.renewsAt) > new Date()) || null;
        const subLabel = u.role === 'admin' ? 'admin (excluded from draws)' : active ? `active · renews ${new Date(active.renewsAt).toLocaleDateString()}` : userSubs.length ? `${userSubs[0].status} · needs active plan` : 'no subscription — needs payment';
        const isNew = u.createdAt && (Date.now() - new Date(u.createdAt).getTime()) < 24 * 3600 * 1000;
        return (
          <div key={u.id} className="card text-sm">
            <p className="font-bold">{u.name} {isNew && <span className="badge bg-mint/15 text-mint ml-1">NEW</span>} <span className="text-slate-400 font-normal">· {u.email} · {u.role} · charity {u.charityId} ({u.contribPct}%)</span></p>
            <p className="text-xs mt-1">Subscription: <b className={active ? 'text-mint' : 'text-gold'}>{subLabel}</b> · Scores: <b>{scores.length}/5</b> · Registered: {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</p>
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
