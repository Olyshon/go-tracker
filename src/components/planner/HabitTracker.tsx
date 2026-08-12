import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { Habit } from "@/lib/planner-store";
import { WEEKDAYS_RU } from "@/lib/planner-store";
import { cn } from "@/lib/utils";
import { Panel, SectionTitle } from "./ui-bits";

type DayInfo = {
  day: number;
  weekday: number;
  isWeekend: boolean;
  isToday: boolean;
  isFuture: boolean;
  isWeekStart: boolean;
};

type Props = {
  habits: Habit[];
  days: DayInfo[];
  checks: Record<string, number[]>;
  availableDays: number;
  onToggle: (habitId: string, day: number) => void;
  onAdd: (title: string, emoji: string) => void;
  onUpdate: (id: string, title: string, emoji: string) => void;
  onRemove: (id: string) => void;
};

export function HabitTracker({
  habits,
  days,
  checks,
  availableDays,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [form, setForm] = useState<{ id: string | null; title: string; emoji: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.title.trim()) return;
    const emoji = form.emoji.trim() || "•";
    if (form.id) onUpdate(form.id, form.title.trim(), emoji);
    else onAdd(form.title.trim(), emoji);
    setForm(null);
  };

  return (
    <Panel className="min-w-0 p-0">
      <div className="p-4 pb-2">
        <SectionTitle
          right={
            <button
              type="button"
              onClick={() => setForm({ id: null, title: "", emoji: "" })}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-olive hover:text-olive"
            >
              <Plus className="size-3.5" /> Добавить привычку
            </button>
          }
        >
          Трекер продуктивности
        </SectionTitle>

        {form && (
          <form onSubmit={submit} className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              placeholder="🙂"
              className="w-14 rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm outline-none focus:border-olive"
            />
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Название привычки"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-olive"
            />
            <button
              type="submit"
              className="rounded-md bg-olive px-3 py-1.5 text-xs text-primary-foreground"
            >
              {form.id ? "Сохранить" : "Добавить"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
            >
              Отмена
            </button>
          </form>
        )}
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[15rem] min-w-[13rem] border-b border-border bg-paper px-4 py-2 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Привычка
              </th>
              {days.map((d) => (
                <th
                  key={d.day}
                  className={cn(
                    "w-9 min-w-9 border-b border-l border-border px-0 py-1 text-center font-normal",
                    d.isWeekStart && "border-l-2 border-l-border-strong",
                    d.isWeekend && "bg-weekend",
                    d.isToday && "bg-olive-faint",
                  )}
                >
                  <div className="text-[10px] lowercase text-muted-foreground">
                    {WEEKDAYS_RU[d.weekday]}
                  </div>
                  <div
                    className={cn(
                      "text-xs tabular-nums",
                      d.isToday ? "font-semibold text-olive" : "text-foreground/70",
                    )}
                  >
                    {d.day}
                  </div>
                </th>
              ))}
              <th className="sticky right-0 z-20 w-[9.5rem] min-w-[9.5rem] border-b border-l border-border-strong bg-paper px-3 py-2 text-right text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Прогресс
              </th>
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => {
              const done = checks[h.id] ?? [];
              const doneCount = done.length;
              const pct = availableDays ? Math.round((doneCount / availableDays) * 100) : 0;
              return (
                <tr key={h.id} className="group/row">
                  <td className="sticky left-0 z-10 border-b border-border bg-paper px-4 py-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="min-w-0 truncate">
                        <span className="mr-1.5">{h.emoji}</span>
                        {h.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label="Переименовать привычку"
                          onClick={() => setForm({ id: h.id, title: h.title, emoji: h.emoji })}
                          className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover/row:opacity-100 focus:opacity-100"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить привычку"
                          onClick={() => onRemove(h.id)}
                          className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover/row:opacity-100 focus:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    </div>
                  </td>
                  {days.map((d) => {
                    const active = done.includes(d.day);
                    return (
                      <td
                        key={d.day}
                        className={cn(
                          "border-b border-l border-border p-0",
                          d.isWeekStart && "border-l-2 border-l-border-strong",
                          d.isWeekend && "bg-weekend",
                          d.isFuture && "opacity-45",
                        )}
                      >
                        <button
                          type="button"
                          aria-label={`${h.title}, день ${d.day}`}
                          aria-pressed={active}
                          onClick={() => onToggle(h.id, d.day)}
                          className="grid h-7 w-full place-items-center"
                        >
                          <span
                            className={cn(
                              "grid size-[18px] place-items-center rounded-[4px] border transition-colors",
                              active
                                ? "border-olive bg-olive text-primary-foreground"
                                : "border-border-strong bg-background hover:border-olive hover:bg-olive-faint",
                            )}
                          >
                            {active && <Check className="size-3" strokeWidth={3} />}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 border-b border-l border-border-strong bg-paper px-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">
                        {doneCount}
                      </span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-olive transition-[width] duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-9 text-right text-xs tabular-nums">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[11px] text-muted-foreground">
        Проведите таблицу по горизонтали, чтобы увидеть все дни месяца.
      </p>
    </Panel>
  );
}
