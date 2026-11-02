import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <Input {...props} type={visible ? 'text' : 'password'} className="pr-11" />
    <Button type="button" variant="ghost" size="icon" disabled={props.disabled}
      aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
      title={visible ? 'Скрыть пароль' : 'Показать пароль'} aria-pressed={visible}
      onClick={() => setVisible(value => !value)}
      className="absolute right-0 top-0 size-9 text-muted-foreground">
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </Button>
  </div>;
}