import { NavLink, Outlet, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function RequireAuth({ admin, children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <div className="card">Please <Link className="underline" to="/login">login</Link> first.</div>;
  if (admin && !isAdmin) return <div className="card">Admins only. Logged in as {user.email}.</div>;
  return children;
}

export function SubNav() {
  const c = ({ isActive }) => 'navlink text-sm' + (isActive ? ' navlink-active' : '');
  return (
    <div className="flex flex-wrap gap-1 mb-5">
      <NavLink end to="/dashboard" className={c}>Overview</NavLink>
      <NavLink to="/dashboard/scores" className={c}>Scores</NavLink>
      <NavLink to="/dashboard/draws" className={c}>Draws</NavLink>
      <NavLink to="/dashboard/winnings" className={c}>Winnings</NavLink>
      <NavLink to="/dashboard/charity" className={c}>Charity</NavLink>
      <NavLink to="/dashboard/subscription" className={c}>Subscription</NavLink>
      <NavLink to="/dashboard/settings" className={c}>Settings</NavLink>
    </div>
  );
}

export function AdminNav() {
  const c = ({ isActive }) => 'navlink text-sm' + (isActive ? ' navlink-active' : '');
  return (
    <div className="flex flex-wrap gap-1 mb-5">
      <NavLink end to="/admin" className={c}>Overview</NavLink>
      <NavLink to="/admin/users" className={c}>Users</NavLink>
      <NavLink to="/admin/subscriptions" className={c}>Subscriptions</NavLink>
      <NavLink to="/admin/draws" className={c}>Draws</NavLink>
      <NavLink to="/admin/charities" className={c}>Charities</NavLink>
      <NavLink to="/admin/winners" className={c}>Winners</NavLink>
      <NavLink to="/admin/reports" className={c}>Reports</NavLink>
    </div>
  );
}
export function DashOutlet() {
  const { isAdmin } = useAuth();
  // Admins have no subscription — subscriber dashboard is meaningless for them.
  if (isAdmin) return <Navigate to="/admin" replace />;
  return (<><SubNav /><Outlet /></>);
}
export function AdminOutlet() { return (<><AdminNav /><Outlet /></>); }
