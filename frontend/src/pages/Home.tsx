import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, CheckSquare, MessageSquare, Sparkles, Trophy } from 'lucide-react';
import { Logo, ThemeToggle } from '../components/Layout';
import { useAuth } from '../context';

const features = [
  { icon: BookOpen, title: 'Vos cours, rangés par matière', text: 'Importez vos PDF et retrouvez tout au même endroit.' },
  { icon: MessageSquare, title: 'Un tuteur qui connaît votre cours', text: 'Posez vos questions : les réponses s’appuient sur vos propres documents.' },
  { icon: Sparkles, title: 'Résumés et fiches de révision', text: 'Générés à partir de vos documents, sauvegardés dans le cours.' },
  { icon: Trophy, title: 'Quiz à trois niveaux', text: 'QCM corrigés automatiquement, avec l’explication de chaque réponse.' },
  { icon: CheckSquare, title: 'Devoirs et échéances', text: 'Priorités, dates limites et suivi : à faire, en cours, terminé.' },
  { icon: BarChart3, title: 'Votre progression en graphiques', text: 'Évolution des scores, moyenne et révisions par cours.' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? <Link to="/dashboard" className="btn-primary">Mon dashboard</Link> : (
            <>
              <Link to="/login" className="btn-ghost">Se connecter</Link>
              <Link to="/register" className="btn-primary hidden sm:inline-flex">Créer un compte</Link>
            </>
          )}
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Révisez mieux, avec vos propres cours comme point de départ.</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600 dark:text-slate-300">
            Smart Study Assistant réunit vos cours, vos tâches et un assistant IA qui résume, explique et vous interroge sur vos documents.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={user ? '/courses' : '/register'} className="btn-primary px-6 py-3">Commencer gratuitement</Link>
            <a href="#fonctions" className="btn-ghost px-6 py-3">Découvrir</a>
          </div>
        </div>
        <div className="card shadow-2xl shadow-violet-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Exemple de question de quiz</p>
          <p className="mt-2 font-semibold">Quel organite réalise la photosynthèse ?</p>
          <ul className="mt-3 space-y-2 text-sm">
            {['La mitochondrie', 'Le chloroplaste', 'Le noyau', 'Le ribosome'].map((o, i) => (
              <li key={o} className={`rounded-xl border px-3 py-2 ${i === 1 ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-200 dark:border-white/10'}`}>{o}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500">Après chaque quiz, vous voyez la bonne réponse et pourquoi.</p>
        </div>
      </section>
      <section id="fonctions" className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-8 text-2xl font-bold">Tout pour organiser vos études</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card"><Icon className="mb-3 text-violet-600 dark:text-violet-400" size={22} />
              <h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p></div>
          ))}
        </div>
      </section>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-white/10">© {new Date().getFullYear()} Smart Study Assistant</footer>
    </div>
  );
}
