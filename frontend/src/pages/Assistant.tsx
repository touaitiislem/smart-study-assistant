import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Lightbulb, MessageSquare, NotebookPen, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { api, errMsg } from '../api';
import Markdown from '../components/Markdown';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { useToast } from '../context';
import { Conversation, Course, Message, Note } from '../lib';

const TABS = [
  { id: 'chat', label: 'Discuter', icon: MessageSquare },
  { id: 'summary', label: 'Résumer', icon: BookOpen },
  { id: 'sheet', label: 'Fiche de révision', icon: NotebookPen },
  { id: 'explain', label: 'Expliquer', icon: Lightbulb },
] as const;
type Tab = (typeof TABS)[number]['id'];

function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => { api.get<Course[]>('/courses').then(setCourses).catch(() => {}); }, []);
  return courses;
}

export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'chat') as Tab;
  const courseParam = params.get('course') ?? '';
  const courses = useCourses();
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">Assistant IA</h1>
      <div role="tablist" className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-navy-900">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams(courseParam ? { tab: id, course: courseParam } : { tab: id })}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === id ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === 'chat' ? <ChatTab courses={courses} initialCourse={courseParam} /> : <ToolTab key={tab} mode={tab} courses={courses} initialCourse={courseParam} />}
    </div>
  );
}

function CourseSelect({ courses, value, onChange, label, optional = true }: { courses: Course[]; value: string; onChange: (v: string) => void; label: string; optional?: boolean }) {
  return (
    <select className="input w-auto max-w-full" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{optional ? 'Sans cours (connaissances générales)' : 'Choisir un cours…'}</option>
      {courses.map((c) => <option key={c.id} value={c.id}>{c.subject} — {c.title}</option>)}
    </select>
  );
}

/* ---------- Chat ---------- */
function ChatTab({ courses, initialCourse }: { courses: Course[]; initialCourse: string }) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState(initialCourse);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = () => api.get<Conversation[]>('/conversations').then(setConvs).catch((e) => setError(errMsg(e)));
  useEffect(() => { loadConvs(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function open(c: Conversation) {
    setError(null);
    try { const r = await api.get<{ messages: Message[] }>(`/conversations/${c.id}`); setConvId(c.id); setCourseId(c.course_id ?? ''); setMessages(r.messages); }
    catch (e) { setError(errMsg(e)); }
  }
  async function remove(id: string) {
    if (!confirm('Supprimer cette conversation ?')) return;
    try { await api.del(`/conversations/${id}`); if (convId === id) { setConvId(null); setMessages([]); } loadConvs(); } catch (e) { setError(errMsg(e)); }
  }
  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput(''); setError(null); setBusy(true);
    setMessages((m) => [...m, { role: 'user', content: message }]);
    try {
      const r = await api.post<{ conversationId: string; message: string }>('/ai/chat', { message, conversationId: convId ?? undefined, courseId: convId ? undefined : courseId || undefined });
      setConvId(r.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: r.message }]);
      loadConvs();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <div className="grid h-[calc(100vh-15rem)] min-h-[420px] gap-4 lg:grid-cols-[250px_1fr]">
      <aside className="card flex min-h-0 flex-col p-3">
        <button className="btn-primary mb-3" onClick={() => { setConvId(null); setMessages([]); setError(null); }}><Plus size={16} /> Nouvelle conversation</button>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {convs.map((c) => (
            <li key={c.id} className={`group flex items-center rounded-lg ${c.id === convId ? 'bg-violet-500/15' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
              <button className="min-w-0 flex-1 px-2 py-2 text-left" onClick={() => open(c)}>
                <span className="block truncate text-sm">{c.title}</span>{c.course_title && <span className="block truncate text-xs text-slate-500">{c.course_title}</span>}</button>
              <button aria-label="Supprimer la conversation" className="px-2 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
            </li>
          ))}
          {convs.length === 0 && <li className="p-2 text-xs text-slate-500">Vos conversations seront listées ici.</li>}
        </ul>
      </aside>
      <section className="card flex min-h-0 flex-col p-0">
        <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-white/10">
          <span className="text-sm font-medium">Cours :</span>
          {convId ? <span className="text-sm">{courses.find((c) => c.id === courseId)?.title ?? 'aucun'}</span>
            : <CourseSelect courses={courses} value={courseId} onChange={setCourseId} label="Cours de référence" />}
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !busy && <Empty>{courseId ? 'Posez une question : l’assistant répondra à partir des documents de ce cours.' : 'Posez n’importe quelle question d’étude, ou choisissez un cours pour des réponses basées sur vos documents.'}</Empty>}
          {messages.map((m, i) => (
            <div key={i} className={`animate-rise flex ${m.role === 'user' ? 'justify-end' : ''}`}>
              <div className={`max-w-[92%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'whitespace-pre-wrap bg-violet-600 text-sm text-white' : 'bg-slate-100 dark:bg-white/5'}`}>
                {m.role === 'user' ? m.content : <Markdown>{m.content}</Markdown>}</div>
            </div>
          ))}
          {busy && <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> L’assistant réfléchit…</p>}
          <div ref={endRef} />
        </div>
        <div className="space-y-2 border-t border-slate-200 p-3 dark:border-white/10">
          <ErrorBox message={error} />
          <div className="flex gap-2">
            <textarea className="input max-h-40 min-h-[42px] resize-none" rows={1} placeholder="Votre question… (Entrée pour envoyer)" aria-label="Message" value={input} maxLength={8000}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="btn-primary" onClick={send} disabled={busy || !input.trim()} aria-label="Envoyer"><Send size={16} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Résumer / Fiche / Expliquer ---------- */
function ToolTab({ mode, courses, initialCourse }: { mode: 'summary' | 'sheet' | 'explain'; courses: Course[]; initialCourse: string }) {
  const toast = useToast();
  const [courseId, setCourseId] = useState(initialCourse);
  const [concept, setConcept] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    if (mode !== 'explain' && !courseId) return setError('Choisissez un cours.');
    if (mode === 'explain' && concept.trim().length < 3) return setError('Décrivez la notion à expliquer (3 caractères minimum).');
    setBusy(true);
    try {
      if (mode === 'explain') {
        const r = await api.post<{ content: string; note: Note | null }>('/ai/explain', { concept, courseId: courseId || undefined });
        setResult(r.content); setSaved(!!r.note);
      } else {
        const n = await api.post<Note>(`/ai/${mode}`, { courseId });
        setResult(n.content); setSaved(true);
      }
      toast.success('Terminé.');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  const cta = { summary: 'Générer le résumé', sheet: 'Générer la fiche', explain: 'Expliquer simplement' }[mode];
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <section className="card flex flex-col gap-3 self-start">
        <CourseSelect courses={courses} value={courseId} onChange={setCourseId} label="Cours" optional={mode === 'explain'} />
        {mode === 'explain' && <textarea className="input min-h-32" aria-label="Notion à expliquer" placeholder="Ex. : la différence entre mitose et méiose" value={concept} maxLength={1000} onChange={(e) => setConcept(e.target.value)} />}
        {mode !== 'explain' && <p className="text-sm text-slate-500">Utilise tous les documents du cours. Le résultat est sauvegardé dans ses notes de révision.</p>}
        <ErrorBox message={error} />
        <button className="btn-primary" onClick={run} disabled={busy}>{busy ? <Spinner /> : <Sparkles size={16} />} {busy ? 'Génération…' : cta}</button>
      </section>
      <section className="card min-h-[300px]">
        {result ? <div className="space-y-3">{saved && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Sauvegardé dans les notes du cours.</p>}<Markdown>{result}</Markdown></div>
          : <Empty>Le résultat s’affichera ici.</Empty>}
      </section>
    </div>
  );
}
