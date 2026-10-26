import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { Habit, HabitFrequency } from "@/lib/planner-store";
import { freqLabel, freqOf, habitProgress, isPlanned } from "@/lib/habit-progress";
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
  year: number;
  month: number;
  onToggle: (habitId: string, day: number) => void;
  onAdd: (title: string, emoji: string, freq: HabitFrequency) => void;
  onUpdate: (id: string, title: string, emoji: string, freq: HabitFrequency) => void;
  onRemove: (id: string) => void;
};

export function HabitTracker({
  habits,
  days,
  checks,
  availableDays,
  year,
  month,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [form, setForm] = useState<FormState | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.title.trim()) return;
    const emoji = form.emoji.trim() || "•";
    const freq: HabitFrequency =
      form.type === "daily"
        ? { type: "daily" }
        : form.type === "weekly"
          ? { type: "weekly", times: clamp(form.times, 1, 7), days: [...form.days].sort() }
          : { type: "monthly", times: clamp(form.times, 1, 31) };
    if (form.id) onUpdate(form.id, form.title.trim(), emoji, freq);
    else onAdd(form.title.trim(), emoji, freq);
    setForm(null);
  };

  return (
    <Panel className="min-w-0 p-0">
      <div className="p-4 pb-2">
        <SectionTitle
          right={
            <button
              type="button"
              onClick={() => setForm(newForm())}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-olive hover:text-olive"
            >
              <Plus className="size-3.5" /> Добавить привычку
            </button>
          }
        >
          Трекер продуктивности
        </SectionTitle>

        {form && <HabitForm form={form} setForm={setForm} onSubmit={submit} />}
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
              const { pct } = habitProgress(h, done, year, month, days.length, availableDays);
              const f = freqOf(h);
              return (
                <tr key={h.id} className="group/row">
                  <td className="sticky left-0 z-10 border-b border-border bg-paper px-4 py-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="min-w-0" title={h.title}>
                        <span className="block truncate">
                          <span className="mr-1.5">{h.emoji}</span>
                          {h.title}
                        </span>
                        {f.type !== "daily" && (
                          <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                            {freqLabel(h)}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label="Переименовать привычку"
                          onClick={() => setForm(formFrom(h))}
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
                    const planned = isPlanned(h, d.weekday);
                    const missed = planned && !active && !d.isFuture && !d.isToday;
                    return (
                      <td
                        key={d.day}
                        className={cn(
                          "border-b border-l border-border p-0",
                          d.isWeekStart && "border-l-2 border-l-border-strong",
                          d.isWeekend && "bg-weekend",
                          d.isFuture && !planned && "opacity-45",
                        )}
                      >
                        <button
                          type="button"
                          aria-label={`${h.title}, день ${d.day}${planned ? " (запланировано)" : ""}`}
                          aria-pressed={active}
                          onClick={() => onToggle(h.id, d.day)}
                          className="grid h-7 w-full place-items-center"
                        >
                          <span
                            className={cn(
                              "grid size-[18px] place-items-center rounded-[4px] border transition-colors",
                              active
                                ? "border-olive bg-olive text-primary-foreground"
                                : planned
                                  ? "border-border-strong bg-muted/60 text-muted-foreground/50 hover:border-olive hover:bg-olive-faint"
                                  : "border-border bg-background hover:border-olive hover:bg-olive-faint",
                              missed && "border-dashed border-destructive/35",
                            )}
                          >
                            {active ? (
                              <Check className="size-3" strokeWidth={3} />
                            ) : planned ? (
                              <Check className="size-3" strokeWidth={2} />
                            ) : null}
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
        Серая галочка — запланировано, пунктир — пропущено. Отмечать можно любой день.
      </p>
    </Panel>
  );
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, Math.round(n) || a));

const EMOJIS = ["⏰","🏃","🚿","🥣","💪","🎯","📱","💰","📚","📅","🧘","🛏️","💧","🥗","✍️","🎨","🎧","🚶","🧹","🌿"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type FormState = {
  id: string | null;
  title: string;
  emoji: string;
  type: HabitFrequency["type"];
  times: number;
  days: number[];
};

const newForm = (): FormState => ({ id: null, title: "", emoji: "", type: "daily", times: 3, days: [] });
const formFrom = (h: Habit): FormState => {
  const f = freqOf(h);
  return {
    id: h.id,
    title: h.title,
    emoji: h.emoji,
    type: f.type,
    times: f.type === "daily" ? 3 : f.times,
    days: f.type === "weekly" ? (f.days ?? []) : [],
  };
};

function HabitForm({
  form,
  setForm,
  onSubmit,
}: {
  form: FormState;
  setForm: (f: FormState | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const field = "rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-olive";
  return (
    <form onSubmit={onSubmit} className="mb-3 space-y-2 rounded-md border border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={form.emoji}
          onChange={(e) => setForm({ ...form, emoji: e.target.value })}
          placeholder="🙂"
          aria-label="Свой эмодзи"
          className={cn(field, "w-14 text-center")}
        />
        <input
          autoFocus
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Название привычки"
          className={cn(field, "min-w-0 flex-1")}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => setForm({ ...form, emoji: em })}
            className={cn(
              "grid size-7 place-items-center rounded-md border text-sm transition-colors",
              form.emoji === em ? "border-olive bg-olive-faint" : "border-transparent hover:border-border",
            )}
          >
            {em}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Частота:</span>
        {(
          [
            ["daily", "Каждый день"],
            ["weekly", "Раз в неделю"],
            ["monthly", "Раз в месяц"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() =>
              setForm({ ...form, type: t, times: t === "weekly" ? Math.min(form.times, 7) : form.times })
            }
            className={cn(
              "rounded-md border px-2.5 py-1 transition-colors",
              form.type === t ? "border-olive bg-olive-faint text-olive" : "border-border text-muted-foreground",
            )}
          >
            {t === "daily" ? label : label.replace("Раз", "N раз")}
          </button>
        ))}
        {form.type !== "daily" && (
          <label className="flex items-center gap-1.5 text-muted-foreground">
            N =
            <input
              type="number"
              min={1}
              max={form.type === "weekly" ? 7 : 31}
              value={form.times}
              onChange={(e) => setForm({ ...form, times: Number(e.target.value) })}
              className={cn(field, "w-16 py-1 text-xs")}
            />
          </label>
        )}
      </div>
      {form.type === "weekly" && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="mr-1 text-muted-foreground">Желательные дни:</span>
          {WEEK_ORDER.map((wd) => {
            const on = form.days.includes(wd);
            return (
              <button
                key={wd}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setForm({ ...form, days: on ? form.days.filter((x) => x !== wd) : [...form.days, wd] })
                }
                className={cn(
                  "w-8 rounded-md border py-1 lowercase transition-colors",
                  on ? "border-olive bg-olive-faint text-olive" : "border-border text-muted-foreground",
                )}
              >
                {WEEKDAYS_RU[wd]}
              </button>
            );
          })}
          <span className="ml-1 text-[11px] text-muted-foreground">необязательно</span>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-olive px-3 py-1.5 text-xs text-primary-foreground">
          {form.id ? "Сохранить" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={() => setForm(null)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
