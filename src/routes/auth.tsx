import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, useHydrated } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/PasswordInput';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { authError, emailSchema, passwordSchema, RECOVERY_NOTICE } from '@/lib/auth-ux';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Вход и регистрация — GO Tracker' },
    { name: 'description', content: 'Войдите в GO Tracker, чтобы сохранить привычки и цели в своём аккаунте.' },
    { property: 'og:title', content: 'Вход в GO Tracker' },
    { property: 'og:description', content: 'Личный аккаунт для привычек и целей.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const [signup, setSignup] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: '/dashboard', replace: true });
    });
  }, [navigate]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    const address = emailSchema.safeParse(email);
    if (!address.success) { setError('Введите корректный адрес электронной почты.'); return; }
    if (!recovery && signup && !passwordSchema.safeParse(password).success) { setError('Пароль должен содержать не менее 6 символов.'); return; }
    if (!recovery && !password) { setError('Введите пароль.'); return; }
    setBusy(true);
    try {
      if (recovery) {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(address.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        // Do not distinguish unregistered addresses from registered ones.
        if (failure && !['user_not_found', 'email_not_found'].includes(failure.code ?? '')) throw failure;
        setNotice(RECOVERY_NOTICE);
      } else if (signup) {
        const { data, error: failure } = await supabase.auth.signUp({ email: address.data, password,
          options: { emailRedirectTo: window.location.origin } });
        if (failure) throw failure;
        if (!data.session) setNotice('Проверьте почту и подтвердите регистрацию по ссылке в письме.');
        else await navigate({ to: '/dashboard', replace: true });
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword({ email: address.data, password });
        if (failure) throw failure;
        await navigate({ to: '/dashboard', replace: true });
      }
    } catch (cause) {
      setError(authError(cause, recovery ? 'recovery' : signup ? 'signup' : 'login'));
    } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-4 py-8">
    <section className="w-full max-w-sm space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">GO Tracker</h1><p className="text-sm text-muted-foreground">Трекер привычек и целей</p></div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <h2 className="font-display text-2xl">{recovery ? 'Восстановление пароля' : signup ? 'Регистрация' : 'Вход'}</h2>
        <label className="block space-y-2 text-sm">Почта<Input disabled={!hydrated || busy} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        {!recovery && <>
          <label className="block space-y-2 text-sm">Пароль<PasswordInput disabled={!hydrated || busy} autoComplete={signup ? 'new-password' : 'current-password'} aria-describedby={signup ? 'password-requirements' : undefined} required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {signup && <PasswordRequirements />}
          {!signup && <Button type="button" variant="link" className="h-auto p-0 text-sm" disabled={!hydrated || busy} onClick={() => { setRecovery(true); setPassword(''); setError(''); setNotice(''); }}>Забыли пароль?</Button>}
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Button type="submit" className="w-full" disabled={!hydrated || busy}>{busy ? 'Подождите…' : recovery ? 'Отправить письмо' : signup ? 'Создать аккаунт' : 'Войти'}</Button>
        <Button type="button" variant="link" className="w-full" disabled={!hydrated || busy} onClick={() => { if (recovery) { setRecovery(false); setSignup(false); } else setSignup(!signup); setPassword(''); setError(''); setNotice(''); }}>{recovery ? 'Вернуться ко входу' : signup ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}</Button>
      </form>
    </section>
  </main>;
}