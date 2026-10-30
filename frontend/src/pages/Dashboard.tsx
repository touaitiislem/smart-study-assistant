import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, CheckSquare, Percent, Trophy } from 'lucide-react';
import { api, errMsg } from '../api';
import { Badge, Empty, ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context';
import { dueLabel, daysUntil, fmtDate, PRIORITY_LABEL, Stats, STATUS_LABEL, Status, Task } from '../lib';

const STATUS_COLOR: Record<Status, string> = { todo: '#94a3b8', in_progress: '#7c3aed', done: '#10b981' };
const tip = { contentStyle: { background: '#101631', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, color: '#e2e8f0', fontSize: 13 } };

const ChartCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="card"><h2 className="mb-3 font-bold">{title}</h2><div className="h-64">{children}</div></section>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<Stats>('/stats'), api.get<Task[]>('/tasks/upcoming')])
      .then(([s, t]) => { setStats(s); setUpcoming(t); }).catch((e) => setError(errMsg(e)));
  }, []);

  if (!stats) return error ? <ErrorBox message={error} /> : <Spinner />;
  const cards = [
    { label: 'Cours enregistrés', value: stats.courses, icon: BookOpen },
    { label: 'Quiz effectués', value: stats.quizzes_taken, icon: Trophy },
    { label: 'Moyenne des scores', value: stats.quizzes_taken ? `${stats.average_score} %` : '–', icon: Percent },
    { label: 'Tâches à faire', value: stats.tasks_open, icon: CheckSquare },
  ];
  const history = stats.scoreHistory.map((s, i) => ({ n: i + 1, ...s }));
  const pie = stats.tasksByStatus.map((t) => ({ name: STATUS_LABEL[t.status], value: t.count, status: t.status }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-bold">Bonjour {user?.name.split(' ')[0]}</h1>
        <p className="text-slate-500">{user?.field ? `${user.field} · ` : ''}Voici où vous en êtes.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><Icon size={20} /></span>
            <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Évolution des scores aux quiz">
          {history.length === 0 ? <Empty>Passez un quiz pour voir votre progression.</Empty> : (
            <ResponsiveContainer><LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
              <XAxis dataKey="n" stroke="#94a3b8" tickFormatter={(n) => `#${n}`} /><YAxis domain={[0, 100]} unit="%" stroke="#94a3b8" />
              <Tooltip {...tip} labelFormatter={(_, p) => p?.[0]?.payload ? `${p[0].payload.title} — ${fmtDate(p[0].payload.created_at)}` : ''} formatter={(v) => [`${v} %`, 'Score']} />
              <Line type="monotone" dataKey="percent" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart></ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Révisions par cours">
          {stats.perCourse.length === 0 ? <Empty>Ajoutez un cours pour suivre vos révisions.</Empty> : (
            <ResponsiveContainer><BarChart data={stats.perCourse}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
              <XAxis dataKey="title" stroke="#94a3b8" tickFormatter={(t: string) => (t.length > 10 ? t.slice(0, 9) + '…' : t)} />
              <YAxis allowDecimals={false} stroke="#94a3b8" /><Tooltip {...tip} /><Legend />
              <Bar dataKey="notes" name="Résumés et fiches" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="quizzes_taken" name="Quiz passés" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Tâches par statut">
          {pie.length === 0 ? <Empty>Aucune tâche pour l’instant.</Empty> : (
            <ResponsiveContainer><PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pie.map((p) => <Cell key={p.status} fill={STATUS_COLOR[p.status]} />)}
              </Pie><Tooltip {...tip} /><Legend />
            </PieChart></ResponsiveContainer>
          )}
        </ChartCard>
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Prochaines échéances</h2><Link to="/tasks" className="text-sm font-semibold text-violet-600 dark:text-violet-400">Voir tout</Link></div>
          {upcoming.length === 0 ? <Empty>Aucune échéance à venir. Ajoutez une date limite à vos tâches.</Empty> : (
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{t.title}</span>
                    <span className="text-xs text-slate-500">{t.course_title ?? 'Sans cours'} · priorité {PRIORITY_LABEL[t.priority].toLowerCase()}</span></span>
                  <span className={`shrink-0 text-xs font-semibold ${daysUntil(t.due_date!) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>{dueLabel(t.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {stats.courses === 0 && <p className="text-center text-sm text-slate-500">Commencez par <Link className="font-semibold text-violet-600 dark:text-violet-400" to="/courses">ajouter un cours</Link>.</p>}
      <Badge>{stats.documents} document(s) importé(s)</Badge>
    </div>
  );
}
