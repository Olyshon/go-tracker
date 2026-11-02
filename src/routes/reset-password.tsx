import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { createFileRoute, Link, useHydrated } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/PasswordInput';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { authError, passwordSchema, recoveryStore, setRecoveryUser } from '@/lib/auth-ux';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Новый пароль — GO Tracker' },
    { name: 'description', content: 'Безопасное восстановление пароля аккаунта GO Tracker.' },
    { property: 'og:title', content: 'Восстановление пароля — GO Tracker' },
    { property: 'og:description', content: 'Установите новый пароль для своего аккаунта GO Tracker.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const hydrated = useHydrated();
  const recoveryUser = useSyncExternalStore(recoveryStore.subscribe, recoveryStore.getSnapshot, recoveryStore.getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setReady(false);
    if (!recoveryUser) return;
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (active) setReady(!error && data.user?.id === recoveryUser);
    });
    return () => { active = false; };
  }, [recoveryUser]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!ready || !recoveryUser) return;
    if (!passwordSchema.safeParse(password).success) { setError('Пароль должен содержать не менее 6 символов.'); return; }
    if (password !== confirmation) { setError('Пароли не совпадают.'); return; }
    setBusy(true);
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || user.user?.id !== recoveryUser) throw new Error('Invalid recovery');
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      setDone(true); setPassword(''); setConfirmation(''); setRecoveryUser(null);
    } catch (cause) { setError(authError(cause, 'reset')); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-4 py-8">
    <section className="w-full max-w-sm space-y-6">
      <h1 className="font-display text-3xl font-semibold">GO Tracker</h1>
      <h2 className="font-display text-2xl">Новый пароль</h2>
      {done ? <><p role="status" className="text-sm">Пароль изменён.</p><Button asChild className="w-full"><Link to="/dashboard">Перейти к трекеру</Link></Button></>
        : ready ? <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block space-y-2 text-sm">Новый пароль<PasswordInput required disabled={busy} value={password} autoComplete="new-password" aria-describedby="password-requirements" onChange={e => setPassword(e.target.value)} /></label>
          <PasswordRequirements />
          <label className="block space-y-2 text-sm">Повторите пароль<PasswordInput required disabled={busy} value={confirmation} autoComplete="new-password" onChange={e => setConfirmation(e.target.value)} /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Подождите…' : 'Сохранить пароль'}</Button>
        </form> : hydrated && <p role="alert" className="text-sm text-muted-foreground">Проверяем ссылку. Если форма не появилась, ссылка недействительна или истекла. Запросите новое письмо для восстановления.</p>}
      {!done && <Button asChild variant="link" className="w-full"><Link to="/auth">Вернуться ко входу</Link></Button>}
    </section>
  </main>;
}