import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadDb, saveDb, resetDb } from '../lib/db.js';
import { cloudEnabled, cloudClient, cloudLoad, cloudPushDebounced, cloudSubscribe, mergeDb } from '../lib/cloud.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [db, setDb] = useState(() => loadDb());
  const [cloudStatus, setCloudStatus] = useState(cloudEnabled ? 'connecting' : 'local');
  const dbRef = useRef(db);
  dbRef.current = db;

  // Local persist (always) + cloud push (when configured).
  useEffect(() => { saveDb(db); }, [db]);
  useEffect(() => {
    if (cloudEnabled) cloudPushDebounced(() => dbRef.current);
  }, [db]);

  // Cross-tab sync (same browser).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'dh_db_v1' && e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue);
          setDb((cur) => mergeDb({ ...cur, sessionUserId: cur.sessionUserId }, { ...incoming, sessionUserId: cur.sessionUserId }));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Cross-device sync (Supabase shared blob).
  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    (async () => {
      try {
        const remote = await cloudLoad();
        if (alive && remote) {
          setDb((cur) => ({ ...mergeDb(cur, remote), sessionUserId: cur.sessionUserId || remote.sessionUserId || null }));
          setCloudStatus('shared');
        } else if (alive) {
          // First device: push local seed so other devices can see it.
          const sb = cloudClient();
          if (sb) {
            const local = dbRef.current;
            const { sessionUserId, ...shared } = local;
            await sb.from('app_db').upsert({ id: 1, data: shared, updated_at: new Date().toISOString() }, { onConflict: 'id' });
          }
          setCloudStatus('shared');
        }
      } catch { if (alive) setCloudStatus('local-error'); }
    })();
    const off = cloudSubscribe((remote) => {
      setDb((cur) => ({ ...mergeDb(cur, remote), sessionUserId: cur.sessionUserId }));
    });
    // Poll fallback (realtime may be disabled on free tier).
    const poll = setInterval(async () => {
      try {
        const remote = await cloudLoad();
        if (remote && alive) setDb((cur) => {
          const merged = mergeDb(cur, remote);
          return JSON.stringify(merged.users?.length) !== JSON.stringify(cur.users?.length) || JSON.stringify(merged.scores?.length) !== JSON.stringify(cur.scores?.length)
            ? { ...merged, sessionUserId: cur.sessionUserId }
            : cur;
        });
      } catch { /* offline */ }
    }, 7000);
    const onFocus = async () => {
      try {
        const remote = await cloudLoad();
        if (remote) setDb((cur) => ({ ...mergeDb(cur, remote), sessionUserId: cur.sessionUserId }));
      } catch { /* ignore */ }
    };
    window.addEventListener('focus', onFocus);
    return () => { alive = false; off(); clearInterval(poll); window.removeEventListener('focus', onFocus); };
  }, []);

  const sessionUser = useMemo(() => db.users.find((u) => u.id === db.sessionUserId) || null, [db]);
  const api = useMemo(() => ({
    db, setDb, cloudStatus, cloudEnabled,
    user: sessionUser,
    isAdmin: sessionUser?.role === 'admin',
    // Backend must validate subscription status on authenticated requests (PRD §3).
    // Here the "server check" is centralised: never trust a client flag.
    activeSubscription: (userId) => {
      const u = db.users.find((x) => x.id === (userId || sessionUser?.id));
      if (!u) return null;
      const sub = db.subscriptions.filter((s) => s.userId === u.id && s.status === 'active')
        .sort((a, b) => (a.renewsAt < b.renewsAt ? 1 : -1))[0] || null;
      if (!sub) return null;
      if (new Date(sub.renewsAt) < new Date()) return null; // lapsed
      return sub;
    },
    signup({ name, email, password, planId = null, charityId = null, contribPct = 10 }) {
      const cleanEmail = String(email || '').trim();
      const cleanPass = String(password || '');
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail.toLowerCase())) return { ok: false, error: 'DUPLICATE' };
      const id = 'u_' + Math.random().toString(36).slice(2, 9);
      const user = { id, name, email: cleanEmail, pass: cleanPass, role: 'subscriber', planId, charityId: charityId || db.charities[0]?.id || null, contribPct: Number(contribPct) || 10, createdAt: new Date().toISOString() };
      // Register + auto-login so the new email works immediately on any device.
      // No subscription yet — user picks plan + pays on Subscription page.
      setDb((d) => {
        if (d.users.some((u) => u.email.toLowerCase() === cleanEmail.toLowerCase())) return d;
        return { ...d, users: [...d.users, user], sessionUserId: id };
      });
      return { ok: true, userId: id };
    },
    login(email, password) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const u = db.users.find((x) => x.email.toLowerCase() === cleanEmail && x.pass === String(password || ''));
      if (!u) {
        // Fallback: also try trimmed password (catches accidental trailing spaces).
        const u2 = db.users.find((x) => x.email.toLowerCase() === cleanEmail && x.pass.trim() === String(password || '').trim());
        if (!u2) return { ok: false, error: 'Invalid credentials. Try the demo logins on the Login page.' };
        setDb((d) => ({ ...d, sessionUserId: u2.id }));
        return { ok: true, user: u2 };
      }
      setDb((d) => ({ ...d, sessionUserId: u.id }));
      return { ok: true, user: u };
    },
    logout() { setDb((d) => ({ ...d, sessionUserId: null })); },
    resetAll() {
      const s = resetDb();
      setDb({ ...s, sessionUserId: null });
      if (cloudEnabled) {
        const sb = cloudClient();
        if (sb) {
          const { sessionUserId, ...shared } = s;
          sb.from('app_db').upsert({ id: 1, data: shared, updated_at: new Date().toISOString() }, { onConflict: 'id' }).then(() => {});
        }
      }
      return s;
    },
  }), [db, sessionUser, cloudStatus]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export function useAuth() { return useContext(Ctx); }
