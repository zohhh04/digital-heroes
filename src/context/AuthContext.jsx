import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadDb, saveDb, resetDb } from '../lib/db.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [db, setDb] = useState(() => loadDb());
  useEffect(() => { saveDb(db); }, [db]);
  const sessionUser = useMemo(() => db.users.find((u) => u.id === db.sessionUserId) || null, [db]);
  const api = useMemo(() => ({
    db, setDb,
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
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { ok: false, error: 'DUPLICATE' };
      const id = 'u_' + Math.random().toString(36).slice(2, 9);
      const user = { id, name, email, pass: password, role: 'subscriber', planId, charityId: charityId || db.charities[0]?.id || null, contribPct: Number(contribPct) || 10, createdAt: new Date().toISOString() };
      // Register-only: no subscription created here. User picks plan + charity
      // on the Subscription page after login. Intentionally NOT logging in.
      setDb((d) => ({ ...d, users: [...d.users, user] }));
      return { ok: true, userId: id };
    },
    login(email, password) {
      const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.pass === password);
      if (!u) return { ok: false, error: 'Invalid credentials. Try the demo logins on the Login page.' };
      setDb((d) => ({ ...d, sessionUserId: u.id }));
      return { ok: true, user: u };
    },
    logout() { setDb((d) => ({ ...d, sessionUserId: null })); },
    resetAll() { setDb(resetDb()); },
  }), [db, sessionUser]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export function useAuth() { return useContext(Ctx); }
