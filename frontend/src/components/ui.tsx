import { ReactNode, useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export const Spinner = ({ className = '' }: { className?: string }) => <Loader2 className={`animate-spin ${className}`} size={16} />;

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{message}</span>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/70 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="card animate-rise w-full max-w-lg shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Badge = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-xs font-medium text-violet-700 dark:text-violet-300">{children}</span>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">{children}</p>
);
