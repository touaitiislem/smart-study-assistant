import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Sparkles, Trash2 } from 'lucide-react';
import { api, errMsg } from '../api';
import { Badge, Empty, ErrorBox, Spinner } from '../components/ui';
import { useToast } from '../context';
import { Course, Difficulty, DIFFICULTIES, fmtDate, QuizResultRow, QuizSummary } from '../lib';

export default function Quizzes() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [results, setResults] = useState<QuizResultRow[]>([]);
  const [courseId, setCourseId] = useState(params.get('course') ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen');
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => Promise.all([api.get<QuizSummary[]>('/quizzes'), api.get<QuizResultRow[]>('/quizzes/results')])
    .then(([q, r]) => { setQuizzes(q); setResults(r); }).catch((e) => setError(errMsg(e)));
  useEffect(() => { api.get<Course[]>('/courses').then(setCourses).catch(() => {}); load(); }, []);

  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!courseId) return setError('Choisissez un cours.');
    setBusy(true); setError(null);
    try {
      const q = await api.post<{ id: string }>('/quizzes/generate', { courseId, difficulty, count, topic: topic || undefined });
      toast.success('Quiz généré !');
      navigate(`/quizzes/${q.id}`);
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  }
  async function remove(q: QuizSummary) {
    if (!confirm(`Supprimer « ${q.title} » et son historique ?`)) return;
    try { await api.del(`/quizzes/${q.id}`); toast.success('Quiz supprimé.'); load(); } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Quiz</h1>
      <form onSubmit={generate} className="card grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_2fr_auto] lg:items-end">
        <div><label className="label" htmlFor="qc">Cours</label>
          <select id="qc" className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            <option value="">Choisir un cours…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.subject} — {c.title}</option>)}</select></div>
        <div><label className="label" htmlFor="qd">Difficulté</label>
          <select id="qd" className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select></div>
        <div><label className="label" htmlFor="qn">Questions</label>
          <input id="qn" type="number" min={3} max={20} className="input" value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div><label className="label" htmlFor="qt">Thème (facultatif)</label>
          <input id="qt" className="input" value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder="ex. chapitre 2" /></div>
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <Sparkles size={16} />} {busy ? 'Génération…' : 'Générer'}</button>
        <div className="md:col-span-2 lg:col-span-5"><ErrorBox message={error} /></div>
      </form>

      <section className="space-y-3">
        <h2 className="font-bold">Mes quiz</h2>
        {!quizzes ? <Spinner /> : quizzes.length === 0 ? <Empty>Aucun quiz. Générez-en un à partir d’un de vos cours.</Empty> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <div key={q.id} className="card flex flex-col gap-3">
                <div><p className="font-bold">{q.title}</p><p className="text-sm text-slate-500">{q.course_title}</p></div>
                <div className="flex flex-wrap gap-2"><Badge>{q.difficulty}</Badge><Badge>{q.question_count} questions</Badge><Badge>{q.attempts} essai(s)</Badge>{q.best_percent !== null && <Badge>meilleur : {q.best_percent} %</Badge>}</div>
                <div className="mt-auto flex gap-2"><Link to={`/quizzes/${q.id}`} className="btn-primary flex-1"><Play size={16} /> {q.attempts ? 'Refaire' : 'Commencer'}</Link>
                  <button className="btn-danger px-3" aria-label={`Supprimer ${q.title}`} onClick={() => remove(q)}><Trash2 size={16} /></button></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">Historique des résultats</h2>
        {results.length === 0 ? <Empty>Vos scores apparaîtront ici après votre premier quiz.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-4">Date</th><th className="pr-4">Quiz</th><th className="pr-4">Cours</th><th className="pr-4">Niveau</th><th>Score</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {results.map((r) => (
                <tr key={r.id}><td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.created_at)}</td><td className="pr-4">{r.title}</td><td className="pr-4">{r.course_title}</td><td className="pr-4">{r.difficulty}</td>
                  <td className="font-semibold">{r.score}/{r.total} <span className="font-normal text-slate-500">({r.percent} %)</span></td></tr>
              ))}
            </tbody></table></div>
        )}
      </section>
    </div>
  );
}
