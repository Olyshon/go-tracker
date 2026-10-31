import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [signup, setSignup] = useState(false);
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
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (signup) {
        const { data, error: failure } = await supabase.auth.signUp({ email, password,
          options: { emailRedirectTo: window.location.origin } });
        if (failure) throw failure;
        if (!data.session) setNotice('Проверьте почту и подтвердите регистрацию по ссылке в письме.');
        else await navigate({ to: '/dashboard', replace: true });
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
        if (failure) throw failure;
        await navigate({ to: '/dashboard', replace: true });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(message.includes('Email not confirmed') ? 'Подтвердите адрес по ссылке в письме.'
        : message.includes('rate limit') ? 'Слишком много попыток. Попробуйте позже.'
        : signup ? 'Не удалось зарегистрироваться. Проверьте адрес и пароль и попробуйте снова.'
        : 'Не удалось войти. Проверьте почту и пароль.');
    } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-4 py-8">
    <section className="w-full max-w-sm space-y-6">
      <div><h1 className="font-display text-3xl font-semibold">GO Tracker</h1><p className="text-sm text-muted-foreground">Трекер привычек и целей</p></div>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-display text-2xl">{signup ? 'Регистрация' : 'Вход'}</h2>
        <label className="block space-y-2 text-sm">Почта<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block space-y-2 text-sm">Пароль<Input type="password" minLength={6} autoComplete={signup ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Подождите…' : signup ? 'Создать аккаунт' : 'Войти'}</Button>
        <Button type="button" variant="link" className="w-full" disabled={busy} onClick={() => { setSignup(!signup); setError(''); setNotice(''); }}>{signup ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}</Button>
      </form>
    </section>
  </main>;
}