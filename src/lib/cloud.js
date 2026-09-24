// Cross-device shared DB via Supabase (single JSON blob, id=1 in app_db).
// - If VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, all devices share
//   the same users/scores/subscriptions/draws: register on phone -> admin on
//   laptop sees it with scores + evaluation.
// - If not set, app runs local-only (this browser) as before.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL || '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const cloudEnabled = Boolean(URL && KEY);

let client = null;
export function cloudClient() {
  if (!cloudEnabled) return null;
  if (!client) client = createClient(URL, KEY);
  return client;
}

const ROW_ID = 1;
const COLLECTIONS = ['users', 'subscriptions', 'scores', 'draws', 'entries', 'pools', 'winners', 'donations', 'contributions', 'payments', 'audit', 'charities'];

function byId(list) {
  const m = new Map();
  for (const r of list || []) if (r && r.id) m.set(r.id, r);
  return m;
}

// Union merge: any record present on EITHER device survives (by id).
// This is what guarantees a registration/score on device B is never lost
// when device A saves. Deletes use tombstones (db._deleted) so a deleted
// user/score stays deleted on all devices.
export function mergeDb(local, remote) {
  if (!remote || typeof remote !== 'object' || !Array.isArray(remote.users)) return local;
  const out = { ...local };
  const delL = (local && local._deleted) || {};
  const delR = (remote && remote._deleted) || {};
  const deleted = {};
  for (const k of [...COLLECTIONS, 'users', 'scores', 'subscriptions', 'entries', 'winners']) {
    deleted[k] = [...new Set([...(delL[k] || []), ...(delR[k] || [])])];
  }
  out._deleted = deleted;
  const delSet = (k) => new Set(deleted[k] || []);
  for (const k of COLLECTIONS) {
    const lm = byId(local[k]);
    const rm = byId(remote[k]);
    const tomb = delSet(k);
    const merged = new Map();
    for (const [id, r] of rm) if (!tomb.has(id)) merged.set(id, r);
    for (const [id, r] of lm) if (!tomb.has(id)) merged.set(id, r);
    // Prefer the fresher copy when both sides have the same id.
    for (const [id, lr] of lm) {
      const rr = rm.get(id);
      if (rr && tomb.has(id)) continue;
      if (rr && JSON.stringify(rr) !== JSON.stringify(lr)) {
        const rt = new Date(rr.updatedAt || rr.updated_at || rr.createdAt || rr.created_at || rr.at || 0).getTime() || 0;
        const lt = new Date(lr.updatedAt || lr.updated_at || lr.createdAt || lr.created_at || lr.at || 0).getTime() || 0;
        merged.set(id, rt > lt ? rr : lr);
      }
    }
    out[k] = [...merged.values()];
  }
  // Settings: keep the freshest rolloverJackpot; fundingPct prefers local admin edit.
  out.settings = { ...(remote.settings || {}), ...(local.settings || {}) };
  if ((remote.settings || {}).rolloverJackpot !== undefined && !local._settingsTouched) {
    out.settings.rolloverJackpot = remote.settings.rolloverJackpot;
  }
  // Session stays per-device: never overwrite my login with another device's.
  out.sessionUserId = local.sessionUserId || null;
  out.version = Math.max(Number(local.version || 1), Number(remote.version || 1));
  return out;
}

export async function cloudLoad() {
  const sb = cloudClient();
  if (!sb) return null;
  const { data, error } = await sb.from('app_db').select('data, updated_at').eq('id', ROW_ID).single();
  if (error) return null;
  return data && data.data && Array.isArray(data.data.users) ? data.data : null;
}

let pushTimer = null;
export function cloudPushDebounced(getDb) {
  const sb = cloudClient();
  if (!sb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      const local = getDb();
      // Read-merge-write so we never wipe another device's new users/scores.
      const remote = await cloudLoad();
      const merged = remote ? mergeDb(local, remote) : local;
      const { _deleted, sessionUserId, ...shared } = merged;
      await sb.from('app_db').upsert({ id: ROW_ID, data: { ...shared, _deleted: merged._deleted || {} }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch { /* offline: local still works */ }
  }, 800);
}

export function cloudSubscribe(onRemote) {
  const sb = cloudClient();
  if (!sb) return () => {};
  const ch = sb
    .channel('app_db_1')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_db', filter: 'id=eq.1' }, async () => {
      try {
        const remote = await cloudLoad();
        if (remote) onRemote(remote);
      } catch { /* ignore */ }
    })
    .subscribe();
  return () => { try { sb.removeChannel(ch); } catch { /* ignore */ } };
}
