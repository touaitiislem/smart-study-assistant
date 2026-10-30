import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo, ThemeToggle } from '../components/Layout';
import { ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context';
import { errMsg } from '../api';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLogin && password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    setBusy(true);
    try {
      if (isLogin) await login(email, password); else await register(name, email, password);
      navigate('/dashboard');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <form onSubmit={submit} className="card animate-rise space-y-4">
          <h1 className="text-xl font-bold">{isLogin ? 'Content de vous revoir' : 'Créer votre compte étudiant'}</h1>
          <ErrorBox message={error} />
          {!isLogin && <div><label className="label" htmlFor="name">Nom</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></div>}
          <div><label className="label" htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
          <div><label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isLogin ? 'current-password' : 'new-password'} />
            {!isLogin && <p className="mt-1 text-xs text-slate-500">8 caractères minimum.</p>}</div>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} {isLogin ? 'Se connecter' : 'Créer mon compte'}</button>
          <p className="text-center text-sm text-slate-500">
            {isLogin ? <>Pas encore de compte ? <Link className="font-semibold text-violet-600 dark:text-violet-400" to="/register">Inscrivez-vous</Link></>
              : <>Déjà inscrit ? <Link className="font-semibold text-violet-600 dark:text-violet-400" to="/login">Connectez-vous</Link></>}
          </p>
        </form>
      </div>
    </div>
  );
}
