import { FormEvent, useEffect, useState } from 'react';
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errMsg } from '../api';
import { Empty, ErrorBox, Modal, Spinner } from '../components/ui';
import { useToast } from '../context';
import { Course, daysUntil, dueLabel, Priority, PRIORITY_LABEL, Status, STATUS_LABEL, Task } from '../lib';

const COLUMNS: Status[] = ['todo', 'in_progress', 'done'];
const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-500/10 text-red-700 dark:text-red-300', medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', low: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

export default function Tasks() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Task[]>('/tasks').then(setTasks).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); api.get<Course[]>('/courses').then(setCourses).catch(() => {}); }, []);

  async function setStatus(t: Task, status: Status) {
    try { await api.patch(`/tasks/${t.id}`, { status }); toast.success(`« ${t.title} » → ${STATUS_LABEL[status].toLowerCase()}.`); load(); } catch (e) { toast.error(errMsg(e)); }
  }
  async function remove(t: Task) {
    if (!confirm(`Supprimer « ${t.title} » ?`)) return;
    try { await api.del(`/tasks/${t.id}`); toast.success('Tâche supprimée.'); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  const upcoming = (tasks ?? []).filter((t) => t.status !== 'done' && t.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Tâches et devoirs</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nouvelle tâche</button></div>
      <ErrorBox message={error} />
      {!tasks ? <Spinner /> : (
        <>
          {upcoming.length > 0 && (
            <section className="card"><h2 className="mb-2 flex items-center gap-2 font-bold"><CalendarClock size={18} /> Prochaines échéances</h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {upcoming.map((t) => (
                  <li key={t.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className={`text-xs font-semibold ${daysUntil(t.due_date!) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>{dueLabel(t.due_date)}</p></li>
                ))}
              </ul></section>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            {COLUMNS.map((col) => {
              const list = tasks.filter((t) => t.status === col);
              return (
                <section key={col} className="space-y-3" aria-label={STATUS_LABEL[col]}>
                  <h2 className="flex items-center justify-between text-sm font-bold uppercase tracking-wide text-slate-500">{STATUS_LABEL[col]}<span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-white/10">{list.length}</span></h2>
                  {list.length === 0 && <Empty>Rien ici.</Empty>}
                  {list.map((t) => (
                    <article key={t.id} className="card animate-rise space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-semibold ${t.status === 'done' ? 'line-through opacity-60' : ''}`}>{t.title}</h3>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                      </div>
                      {t.description && <p className="line-clamp-2 text-sm text-slate-500">{t.description}</p>}
                      <p className="text-xs text-slate-500">{t.course_title ?? 'Sans cours'}{t.due_date && <> · <span className={t.status !== 'done' && daysUntil(t.due_date) < 0 ? 'font-semibold text-red-600 dark:text-red-400' : ''}>{t.due_date.split('-').reverse().join('/')} ({dueLabel(t.due_date)})</span></>}</p>
                      <div className="flex items-center gap-2">
                        <select className="input py-1 text-xs" aria-label={`Statut de ${t.title}`} value={t.status} onChange={(e) => setStatus(t, e.target.value as Status)}>
                          {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                        <button className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" aria-label={`Modifier ${t.title}`} onClick={() => setEditing(t)}><Pencil size={14} /></button>
                        <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-400" aria-label={`Supprimer ${t.title}`} onClick={() => remove(t)}><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}
      {editing && <TaskModal task={editing === 'new' ? null : editing} courses={courses} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TaskModal({ task, courses, onClose, onSaved }: { task: Task | null; courses: Course[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ title: task?.title ?? '', description: task?.description ?? '', due_date: task?.due_date ?? '', priority: task?.priority ?? 'medium', status: task?.status ?? 'todo', course_id: task?.course_id ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = { ...f, due_date: f.due_date || null, course_id: f.course_id || null };
    try {
      if (task) await api.patch(`/tasks/${task.id}`, body); else await api.post('/tasks', body);
      toast.success(task ? 'Tâche modifiée.' : 'Tâche ajoutée.');
      onSaved();
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  }
  return (
    <Modal title={task ? 'Modifier la tâche' : 'Nouvelle tâche'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div><label className="label" htmlFor="tt">Titre</label><input id="tt" className="input" value={f.title} onChange={set('title')} required maxLength={150} autoFocus /></div>
        <div><label className="label" htmlFor="td">Description</label><textarea id="td" className="input min-h-20" value={f.description} onChange={set('description')} maxLength={1000} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="tdate">Date limite</label><input id="tdate" type="date" className="input" value={f.due_date} onChange={set('due_date')} /></div>
          <div><label className="label" htmlFor="tp">Priorité</label><select id="tp" className="input" value={f.priority} onChange={set('priority')}>
            {(['high', 'medium', 'low'] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></div>
          <div><label className="label" htmlFor="ts">Statut</label><select id="ts" className="input" value={f.status} onChange={set('status')}>
            {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
          <div><label className="label" htmlFor="tc">Cours</label><select id="tc" className="input" value={f.course_id} onChange={set('course_id')}>
            <option value="">Aucun</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={busy}>{busy && <Spinner />} Enregistrer</button></div>
      </form>
    </Modal>
  );
}
