import { FormEvent, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { api, errMsg } from '../api';
import { ErrorBox, Spinner } from '../components/ui';
import { useAuth, useTheme, useToast } from '../context';
import { User } from '../lib';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user?.name ?? '', school: user?.school ?? '', field: user?.field ?? '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState<'profile' | 'pw' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(e: FormEvent) {
    e.preventDefault(); setBusy('profile'); setError(null);
    try { setUser(await api.patch<User>('/auth/me', profile)); toast.success('Profil mis à jour.'); } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  }
  async function savePassword(e: FormEvent) {
    e.preventDefault(); setBusy('pw'); setError(null);
    if (pw.next.length < 8) { setBusy(null); return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); }
    try { await api.post('/auth/password', pw); setPw({ current: '', next: '' }); toast.success('Mot de passe modifié.'); } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <ErrorBox message={error} />
      <form onSubmit={saveProfile} className="card space-y-4">
        <h2 className="font-bold">Profil étudiant</h2>
        <div><label className="label" htmlFor="email">Adresse e-mail</label><input id="email" className="input" value={user?.email ?? ''} disabled /></div>
        <div><label className="label" htmlFor="name">Nom</label><input id="name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} maxLength={60} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="school">Établissement</label><input id="school" className="input" value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} maxLength={120} /></div>
          <div><label className="label" htmlFor="field">Filière</label><input id="field" className="input" value={profile.field} onChange={(e) => setProfile({ ...profile, field: e.target.value })} maxLength={120} /></div>
        </div>
        <button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' && <Spinner />} Enregistrer le profil</button>
      </form>
      <form onSubmit={savePassword} className="card space-y-4">
        <h2 className="font-bold">Mot de passe</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="cur">Mot de passe actuel</label><input id="cur" type="password" className="input" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></div>
          <div><label className="label" htmlFor="nxt">Nouveau mot de passe</label><input id="nxt" type="password" className="input" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} /></div>
        </div>
        <button className="btn-ghost" disabled={busy === 'pw'}>{busy === 'pw' && <Spinner />} Changer le mot de passe</button>
      </form>
      <section className="card flex items-center justify-between gap-4">
        <div><h2 className="font-bold">Thème</h2><p className="text-sm text-slate-500">Actuellement : {dark ? 'sombre' : 'clair'}</p></div>
        <button className="btn-ghost" onClick={toggle}>{dark ? <Sun size={16} /> : <Moon size={16} />} Passer en mode {dark ? 'clair' : 'sombre'}</button>
      </section>
    </div>
  );
}
