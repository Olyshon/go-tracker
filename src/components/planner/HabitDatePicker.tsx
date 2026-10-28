import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { dateKey } from '@/lib/habit-dates';

export function HabitDatePicker({ label, value, onChange, optional = false }: { label: string; value?: string | undefined; onChange: (date?: string) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : undefined;
  return <label className="flex items-center gap-2 text-xs text-muted-foreground">
    {label}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" aria-label={label} className="font-normal shadow-none"><CalendarIcon />{date ? format(date, 'dd.MM.yyyy') : 'Без окончания'}</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={date} {...(date ? { defaultMonth: date } : {})} locale={ru} labels={{ labelNext: () => 'Следующий месяц', labelPrevious: () => 'Предыдущий месяц', labelDayButton: (d, modifiers) => `${modifiers['today'] ? 'Сегодня, ' : ''}${format(d, 'PPPP', { locale: ru })}` }} className="pointer-events-auto" onSelect={d => { if (d) { onChange(dateKey(d)); setOpen(false); } }} />
        {optional && <Button variant="ghost" size="sm" className="w-full" onClick={() => { onChange(undefined); setOpen(false); }}>Без окончания</Button>}
      </PopoverContent>
    </Popover>
  </label>;
}