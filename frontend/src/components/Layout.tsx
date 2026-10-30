import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, CheckSquare, GraduationCap, LayoutDashboard, LogOut, Menu, Moon, Settings, Sparkles, Sun, Trophy, X } from 'lucide-react';
import { useAuth, useTheme } from '../context';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'Mes cours', icon: BookOpen },
  { to: '/assistant', label: 'Assistant IA', icon: Sparkles },
  { to: '/quizzes', label: 'Quiz', icon: Trophy },
  { to: '/tasks', label: 'Tâches', icon: CheckSquare },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><GraduationCap size={18} /></span>
      Smart Study
    </Link>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label={dark ? 'Passer au mode clair' : 'Passer au mode sombre'}
      className="rounded-xl border border-slate-300 p-2 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-4 transition-transform dark:border-white/10 dark:bg-navy-900 lg:static lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-center justify-between"><Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive
                ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4 dark:border-white/10">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="mb-3 truncate text-xs text-slate-500">{user?.email}</p>
          <button className="btn-ghost w-full" onClick={async () => { await logout(); navigate('/'); }}><LogOut size={16} /> Se déconnecter</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <button className="rounded-xl border border-slate-300 p-2 dark:border-white/15 lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu size={16} /></button>
          <span className="hidden lg:block" />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
