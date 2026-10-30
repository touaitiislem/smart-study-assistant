import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errMsg } from '../api';
import { Badge, Empty, ErrorBox, Modal, Spinner } from '../components/ui';
import { useToast } from '../context';
import { Course, fmtDate } from '../lib';

export default function Courses() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Course | 'new' | null>(null);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');

  const load = () => api.get<Course[]>('/courses').then(setCourses).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const subjects = useMemo(() => [...new Set((courses ?? []).map((c) => c.subject))].sort((a, b) => a.localeCompare(b)), [courses]);
  const grouped = useMemo(() => {
    const shown = (courses ?? []).filter((c) => (!subject || c.subject === subject) && c.title.toLowerCase().includes(q.toLowerCase()));
    const map = new Map<string, Course[]>();
    shown.forEach((c) => map.set(c.subject, [...(map.get(c.subject) ?? []), c]));
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  }, [courses, q, subject]);

  async function remove(c: Course) {
    if (!confirm(`Supprimer « ${c.title} » ? Ses documents, notes et quiz seront aussi supprimés.`)) return;
    try { await api.del(`/courses/${c.id}`); toast.success('Cours supprimé.'); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mes cours</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Ajouter un cours</button>
      </div>
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Rechercher un cours" aria-label="Rechercher un cours" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" aria-label="Filtrer par matière" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Toutes les matières</option>{subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <ErrorBox message={error} />
      {!courses ? <Spinner /> : grouped.length === 0 ? (
        <Empty>{courses.length === 0 ? 'Aucun cours. Ajoutez votre premier cours puis importez-y vos PDF.' : 'Aucun cours ne correspond à ce filtre.'}</Empty>
      ) : grouped.map(([subj, list]) => (
        <section key={subj} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">{subj}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <div key={c.id} className="card flex flex-col">
                <Link to={`/courses/${c.id}`} className="font-bold hover:text-violet-600 dark:hover:text-violet-300">{c.title}</Link>
                <p className="mb-4 mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{c.description || 'Aucune description.'}</p>
                <div className="mb-3 flex flex-wrap gap-2"><Badge><FileText size={11} className="mr-1 inline" />{c.document_count} doc.</Badge><Badge>{c.note_count} note(s)</Badge><Badge>{c.quiz_count} quiz</Badge></div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Modifié le {fmtDate(c.updated_at)}</span>
                  <span className="flex gap-1">
                    <button aria-label={`Modifier ${c.title}`} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setEditing(c)}><Pencil size={14} /></button>
                    <button aria-label={`Supprimer ${c.title}`} className="rounded-lg p-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-400" onClick={() => remove(c)}><Trash2 size={14} /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {editing && <CourseModal course={editing === 'new' ? null : editing} subjects={subjects} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

export function CourseModal({ course, subjects, onClose, onSaved }: { course: Course | null; subjects: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(course?.title ?? '');
  const [subject, setSubject] = useState(course?.subject ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (course) await api.patch(`/courses/${course.id}`, { title, subject, description }); else await api.post('/courses', { title, subject, description });
      toast.success(course ? 'Cours modifié.' : 'Cours ajouté.');
      onSaved();
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  }
  return (
    <Modal title={course ? 'Modifier le cours' : 'Ajouter un cours'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div><label className="label" htmlFor="ct">Titre</label><input id="ct" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} autoFocus /></div>
        <div><label className="label" htmlFor="cs">Matière</label>
          <input id="cs" className="input" list="subjects" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={80} placeholder="ex. Biologie" />
          <datalist id="subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist></div>
        <div><label className="label" htmlFor="cd">Description (facultatif)</label><textarea id="cd" className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={busy}>{busy && <Spinner />} Enregistrer</button></div>
      </form>
    </Modal>
  );
}
