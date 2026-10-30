import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react';
import { api, errMsg } from '../api';
import { Badge, ErrorBox, Spinner } from '../components/ui';
import { useToast } from '../context';
import { QuizFull, SubmitResult } from '../lib';

export default function QuizPlayer() {
  const { id } = useParams();
  const toast = useToast();
  const [quiz, setQuiz] = useState<QuizFull | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<QuizFull>(`/quizzes/${id}`).then((q) => { setQuiz(q); setAnswers(q.questions.map(() => null)); setResult(null); }).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [id]);

  async function submit() {
    if (!quiz) return;
    const missing = answers.filter((a) => a === null).length;
    if (missing && !confirm(`${missing} question(s) sans réponse. Elles seront comptées fausses. Valider quand même ?`)) return;
    setBusy(true);
    try { setResult(await api.post<SubmitResult>(`/quizzes/${id}/submit`, { answers })); toast.success('Quiz corrigé et score enregistré.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  if (!quiz) return error ? <ErrorBox message={error} /> : <Spinner />;
  const answered = answers.filter((a) => a !== null).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/quizzes" aria-label="Retour aux quiz" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold">{quiz.title}</h1><Badge>{quiz.difficulty}</Badge>
      </div>
      <ErrorBox message={error} />

      {result && (
        <div className="card animate-rise text-center">
          <p className="text-sm text-slate-500">Votre score</p>
          <p className="text-5xl font-extrabold text-violet-600 dark:text-violet-300">{result.score}/{result.total}</p>
          <p className="mt-1 font-semibold">{result.percent} % — {result.percent >= 80 ? 'Excellent !' : result.percent >= 50 ? 'Bien, continuez à réviser.' : 'À retravailler : relisez les explications ci-dessous.'}</p>
          <button className="btn-ghost mt-4" onClick={load}><RotateCcw size={16} /> Refaire le quiz</button>
        </div>
      )}

      {!result && <p className="text-sm text-slate-500" aria-live="polite">{answered}/{quiz.questions.length} réponses</p>}

      {quiz.questions.map((q, i) => {
        const d = result?.details[i];
        return (
          <fieldset key={q.id} className="card space-y-3">
            <legend className="sr-only">Question {i + 1}</legend>
            <p className="font-semibold"><span className="mr-2 text-violet-600 dark:text-violet-300">{i + 1}.</span>{q.text}</p>
            <div className="space-y-2">
              {q.options.map((o, j) => {
                const selected = (d ? d.selected : answers[i]) === j;
                const style = d ? (j === d.correctIndex ? 'border-emerald-500/60 bg-emerald-500/10' : selected ? 'border-red-500/60 bg-red-500/10' : 'border-slate-200 dark:border-white/10')
                  : selected ? 'border-violet-500 bg-violet-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5';
                return (
                  <label key={j} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${style} ${d ? 'cursor-default' : ''}`}>
                    <input type="radio" name={q.id} className="accent-violet-600" checked={selected} disabled={!!result}
                      onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))} />
                    <span className="flex-1">{o}</span>
                    {d && j === d.correctIndex && <Check size={16} className="text-emerald-600" aria-label="Bonne réponse" />}
                    {d && selected && j !== d.correctIndex && <X size={16} className="text-red-600" aria-label="Votre réponse (fausse)" />}
                  </label>
                );
              })}
            </div>
            {d && <p className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/5"><b>{d.correct ? 'Correct. ' : d.selected === null ? 'Sans réponse. ' : 'Incorrect. '}</b>{d.explanation}</p>}
          </fieldset>
        );
      })}

      {!result && <button className="btn-primary w-full py-3" onClick={submit} disabled={busy}>{busy && <Spinner />} Valider mes réponses</button>}
    </div>
  );
}
