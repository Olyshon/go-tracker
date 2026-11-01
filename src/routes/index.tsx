import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'GO Tracker — привычки и цели' },
    { name: 'description', content: 'Личный месячный трекер привычек и целей GO Tracker.' },
    { property: 'og:title', content: 'GO Tracker — привычки и цели' },
    { property: 'og:description', content: 'Ваши привычки, цели и история прогресса в личном аккаунте.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AccountEntry,
});

function AccountEntry() {
  const navigate = useNavigate();
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => navigate({ to: data.user ? '/dashboard' : '/auth', replace: true }))
      .catch(() => navigate({ to: '/auth', replace: true }));
  }, [navigate]);
  return <main className="p-6"><h1 className="font-display text-2xl">GO Tracker</h1><p role="status" className="text-sm text-muted-foreground">Загрузка…</p></main>;
}