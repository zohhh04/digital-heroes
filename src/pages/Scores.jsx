import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { rollScores } from '../lib/engine.js';
import { uid } from '../lib/db.js';

export default function Scores() {
  const { user, db, setDb, activeSubscription } = useAuth();
  const [score, setScore] = useState(30);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null);
  const sub = activeSubscription();
  const mine = db.scores.filter((s) => s.userId === user.id).sort((a, b) => (a.score_date < b.score_date ? 1 : -1));

  function submit(e) {
    e.preventDefault(); setErr('');
    // Scores are ALWAYS saved (per requirement). Draw eligibility still needs
    // an active subscription — enforced in draw management, not here.
    const existing = mine.map((s) => ({ score_date: s.score_date, stableford: s.stableford }));
    if (editing) {
      const others = existing.filter((s) => s.score_date !== editing.score_date);
      // allow keeping same date when editing that row
      const r = rollScores(others, { score_date: date, stableford: score }, { allowEdit: false });
      // editing to a date that collides with another row is rejected:
      if (!r.ok) return setErr(r.error);
      setDb((d) => ({ ...d, scores: [...d.scores.filter((s) => s.id !== editing.id), { ...editing, score_date: date, stableford: Number(score) }] }));
      setEditing(null); return;
    }
    const r = rollScores(existing, { score_date: date, stableford: score });
    if (!r.ok) return setErr(r.error);
    // enforce max-5: drop oldest date not in retained set
    const keep = new Set(r.scores.map((s) => s.score_date + ':' + s.stableford));
    setDb((d) => {
      const others = d.scores.filter((s) => s.userId !== user.id);
      const myRows = d.scores.filter((s) => s.userId === user.id);
      const merged = [...myRows, { id: uid('sc'), userId: user.id, score_date: date, stableford: Number(score) }]
        .sort((a, b) => (a.score_date < b.score_date ? 1 : -1)).slice(0, 5);
      void keep;
      return { ...d, scores: [...others, ...merged] };
    });
  }
  function del(id) { setDb((d) => ({ ...d, scores: d.scores.filter((s) => s.id !== id), _deleted: { ...(d._deleted || {}), scores: [...((d._deleted || {}).scores || []), id] } })); }
  function startEdit(row) { setEditing(row); setScore(row.stableford); setDate(row.score_date); }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Golf scores <span className="text-sm font-normal text-slate-400">(rolling 5, newest first)</span></h1>
      {!sub && <div className="card border-gold/40 text-sm">Scores are saved, but you need an <b>active subscription</b> for them to count in draws. <Link className="underline" to="/dashboard/subscription">Subscribe now →</Link></div>}
      <form onSubmit={submit} className="card space-y-3">
        {err && <p className="text-sm text-rose bg-rose/10 border border-rose/30 rounded-xl px-3 py-2">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Stableford (1–45)</label><input className="input" type="number" min={1} max={45} value={score} onChange={(e) => setScore(e.target.value)} /></div>
          <div><label className="label">Score date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary">{editing ? 'Save edit' : 'Add score'}</button>
          {editing && <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>}
        </div>
        <p className="text-xs text-slate-500">Rule: one entry per date (DB unique constraint in production). Adding a 6th score auto-replaces the oldest.</p>
      </form>
      <div className="card">
        <table className="table"><thead><tr><th>Date</th><th>Score</th><th></th></tr></thead>
          <tbody>{mine.map((s) => (
            <tr key={s.id}><td>{s.score_date}</td><td className="font-bold">{s.stableford}</td>
              <td className="text-right"><button className="underline text-xs mr-3" onClick={() => startEdit(s)}>Edit</button><button className="underline text-xs text-rose" onClick={() => del(s.id)}>Delete</button></td></tr>
          ))}</tbody></table>
        {mine.length === 0 && <p className="text-sm text-slate-400 mt-2">No scores yet.</p>}
      </div>
    </div>
  );
}
