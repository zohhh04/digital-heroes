import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { uid } from '../../lib/db.js';

const BLANK = { name: '', description: '', image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80', events: '', featured: false };

export default function CharitiesAdmin() {
  const { db, setDb } = useAuth();
  const [f, setF] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  function submit(e) {
    e.preventDefault();
    if (!f.name) return alert('Name required');
    if (editId) setDb((d) => ({ ...d, charities: d.charities.map((c) => c.id === editId ? { ...c, ...f } : c) }));
    else setDb((d) => ({ ...d, charities: [...d.charities, { id: uid('ch'), active: true, raised: 0, ...f }] }));
    setF(BLANK); setEditId(null);
  }
  function toggle(id, k) { setDb((d) => ({ ...d, charities: d.charities.map((c) => c.id === id ? { ...c, [k]: !c[k] } : c) })); }
  function remove(id) { if (confirm('Delete charity?')) setDb((d) => ({ ...d, charities: d.charities.filter((c) => c.id !== id) })); }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Charity management</h1>
      <form onSubmit={submit} className="card space-y-2 text-sm">
        <p className="font-bold">{editId ? 'Edit charity' : 'Add charity'}</p>
        <input className="input" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <input className="input" placeholder="Image URL" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} />
        <input className="input" placeholder="Events (e.g. Golf Day — Oct 12)" value={f.events} onChange={(e) => setF({ ...f, events: e.target.value })} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured on homepage</label>
        <div className="flex gap-2"><button className="btn-primary">{editId ? 'Save' : 'Add'}</button>{editId && <button type="button" className="btn-ghost" onClick={() => { setEditId(null); setF(BLANK); }}>Cancel</button>}</div>
      </form>
      {db.charities.map((c) => (
        <div key={c.id} className="card text-sm flex flex-wrap gap-2 items-center">
          <img src={c.image} alt="" className="w-16 h-12 object-cover rounded-lg" />
          <div className="min-w-[200px]"><b>{c.name}</b><p className="text-slate-400">{c.description} · {c.active ? 'active' : 'hidden'} {c.featured ? '· featured' : ''}</p></div>
          <div className="ml-auto flex gap-2">
            <button className="btn-ghost text-xs" onClick={() => { setEditId(c.id); setF({ name: c.name, description: c.description, image: c.image, events: c.events, featured: !!c.featured }); }}>Edit</button>
            <button className="btn-ghost text-xs" onClick={() => toggle(c.id, 'featured')}>Feature</button>
            <button className="btn-ghost text-xs" onClick={() => toggle(c.id, 'active')}>Hide/Show</button>
            <button className="btn-ghost text-xs text-rose" onClick={() => remove(c.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
