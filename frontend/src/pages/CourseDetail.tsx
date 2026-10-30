import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Download, ExternalLink, FileText, MessageSquare, NotebookPen, Sparkles, Trash2, Trophy, Upload } from 'lucide-react';
import { api, errMsg } from '../api';
import Markdown from '../components/Markdown';
import { Badge, Empty, ErrorBox, Spinner } from '../components/ui';
import { useToast } from '../context';
import { CourseDetail as Detail, Doc, fmtDate, fmtSize, Note, NOTE_LABEL } from '../lib';

export default function CourseDetail() {
  const { id } = useParams();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [course, setCourse] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);

  const load = () => api.get<Detail>(`/courses/${id}`).then(setCourse).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [id]);

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Fichier trop volumineux (10 Mo maximum).');
    const form = new FormData();
    form.append('file', file);
    setBusy('upload');
    try {
      const d = await api.upload<Doc & { warning: string | null }>(`/courses/${id}/documents`, form);
      d.warning ? toast.error(d.warning) : toast.success('Document importé.');
      await load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  }

  async function removeDoc(d: Doc) {
    if (!confirm(`Supprimer ${d.filename} ?`)) return;
    try { await api.del(`/documents/${d.id}`); toast.success('Document supprimé.'); load(); } catch (e) { toast.error(errMsg(e)); }
  }
  async function removeNote(n: Note) {
    if (!confirm(`Supprimer « ${n.title} » ?`)) return;
    try { await api.del(`/notes/${n.id}`); load(); } catch (e) { toast.error(errMsg(e)); }
  }
  async function generate(kind: 'summary' | 'sheet') {
    setBusy(kind);
    try {
      const n = await api.post<Note>(`/ai/${kind}`, { courseId: id });
      toast.success(kind === 'summary' ? 'Résumé généré.' : 'Fiche de révision générée.');
      await load(); setOpenNote(n.id);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  }

  if (!course) return error ? <ErrorBox message={error} /> : <Spinner />;
  const hasText = course.documents.some((d) => d.text_length > 0);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/courses" aria-label="Retour aux cours" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-bold">{course.title}</h1><Badge>{course.subject}</Badge>
      </div>
      {course.description && <p className="text-slate-600 dark:text-slate-400">{course.description}</p>}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!hasText || !!busy} onClick={() => generate('summary')}>{busy === 'summary' ? <Spinner /> : <Sparkles size={16} />} Résumer le cours</button>
        <button className="btn-ghost" disabled={!hasText || !!busy} onClick={() => generate('sheet')}>{busy === 'sheet' ? <Spinner /> : <NotebookPen size={16} />} Fiche de révision</button>
        <Link to={`/quizzes?course=${course.id}`} className="btn-ghost"><Trophy size={16} /> Générer un quiz</Link>
        <Link to={`/assistant?course=${course.id}`} className="btn-ghost"><MessageSquare size={16} /> Poser une question</Link>
      </div>
      {!hasText && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
        Importez un PDF contenant du texte pour activer les résumés, fiches et quiz.</p>}

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Documents</h2>
          <button className="btn-ghost" disabled={busy === 'upload'} onClick={() => fileRef.current?.click()}>{busy === 'upload' ? <Spinner /> : <Upload size={16} />} Importer un fichier</button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="hidden" onChange={upload} aria-label="Importer un document" />
        </div>
        {course.documents.length === 0 ? <Empty>Aucun document. Formats acceptés : PDF, TXT, MD (10 Mo max).</Empty> : (
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {course.documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <FileText size={18} className="shrink-0 text-violet-600 dark:text-violet-400" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{d.filename}</p>
                  <p className="text-xs text-slate-500">{fmtSize(d.size_bytes)} · {fmtDate(d.created_at)} · {d.text_length > 0 ? `${d.text_length.toLocaleString('fr-FR')} caractères lisibles par l’IA` : 'aucun texte extrait'}</p></div>
                <a className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${d.filename}`}><ExternalLink size={16} /></a>
                <a className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" href={`/api/documents/${d.id}/file?download=1`} aria-label={`Télécharger ${d.filename}`}><Download size={16} /></a>
                <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-400" onClick={() => removeDoc(d)} aria-label={`Supprimer ${d.filename}`}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><BookOpenCheck size={18} /> Notes de révision</h2>
        {course.notes.length === 0 ? <Empty>Vos résumés, fiches et explications générés par l’IA seront sauvegardés ici.</Empty> : (
          <ul className="space-y-2">
            {course.notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 p-3">
                  <button className="min-w-0 flex-1 text-left" aria-expanded={openNote === n.id} onClick={() => setOpenNote(openNote === n.id ? null : n.id)}>
                    <span className="block truncate text-sm font-semibold">{n.title}</span><span className="text-xs text-slate-500">{NOTE_LABEL[n.kind]} · {fmtDate(n.created_at)}</span></button>
                  <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-500/10 dark:text-red-400" onClick={() => removeNote(n)} aria-label={`Supprimer ${n.title}`}><Trash2 size={15} /></button>
                </div>
                {openNote === n.id && <div className="border-t border-slate-200 p-4 dark:border-white/10"><Markdown>{n.content}</Markdown></div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
