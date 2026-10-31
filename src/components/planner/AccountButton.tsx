import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export function AccountButton() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signOut = async () => {
    setBusy(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error: failure } = await supabase.auth.signOut();
    if (failure) { setError('Не удалось выйти. Попробуйте снова.'); setBusy(false); return; }
    await navigate({ to: '/auth', replace: true });
  };
  return <>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Button variant="outline" size="icon" className="size-8 rounded-full" aria-label="Выйти" title="Выйти" disabled={busy} onClick={() => void signOut()}><LogOut /></Button>
  </>;
}