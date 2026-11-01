import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from '@/components/ui/button';
import { AccountButton } from "@/components/planner/AccountButton";
import { DataMenu } from "@/components/planner/DataMenu";
import { GoalsPanel } from "@/components/planner/GoalsPanel";
import { HabitTracker } from "@/components/planner/HabitTracker";
import { OverallDonut, ProductivityChart } from "@/components/planner/Charts";
import { Bar, Panel } from "@/components/planner/ui-bits";
import { MONTHS_RU, daysInMonth, useMonthData } from "@/lib/planner-store";
import { dayScore, habitProgress } from "@/lib/habit-progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "GO Tracker — трекер привычек и целей на месяц" },
      {
        name: "description",
        content:
          "GO Tracker — элегантный месячный планер: цели месяца, трекер привычек по дням, графики продуктивности и общий прогресс.",
      },
      { property: "og:title", content: "GO Tracker — трекер привычек и целей" },
      {
        property: "og:description",
        content: "Месячный планер с трекером привычек, целями и графиками продуктивности.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});

function KpiBlock({
  label,
  value,
  percent,
  hint,
}: {
  label: string;
  value: string;
  percent: number;
  hint?: string;
}) {
  return (
    <Panel className="px-4 py-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
        <span className="min-w-0 truncate text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 font-display text-lg font-semibold leading-none tabular-nums">
          {value}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <Bar value={percent} className="h-1" />
        <span className="w-14 shrink-0 truncate text-right text-[10px] tabular-nums text-muted-foreground">
          {hint ?? `${percent}%`}
        </span>
      </div>
    </Panel>
  );
}

function PlannerPage() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const store = useMonthData(cursor.year, cursor.month);
  const { data } = store;

  const total = daysInMonth(cursor.year, cursor.month);
  const isCurrentMonth =
    cursor.year === today.getFullYear() && cursor.month === today.getMonth();
  const isPast =
    cursor.year < today.getFullYear() ||
    (cursor.year === today.getFullYear() && cursor.month < today.getMonth());

  const days = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const day = i + 1;
        const date = new Date(cursor.year, cursor.month, day);
        const weekday = date.getDay();
        return {
          day,
          weekday,
          isWeekend: weekday === 0 || weekday === 6,
          isToday: isCurrentMonth && day === today.getDate(),
          isFuture: isCurrentMonth ? day > today.getDate() : !isPast,
          isWeekStart: weekday === 1,
        };
      }),
    [cursor.year, cursor.month, total, isCurrentMonth, isPast, today],
  );

  const availableDays = isCurrentMonth ? today.getDate() : isPast ? total : 0;

  const habitCount = data.habits.length;

  const chartData = useMemo(
    () =>
      days.map((d) => {
        if (d.isFuture || !habitCount) return { day: d.day, value: 0 };
        return { day: d.day, value: dayScore(data.habits, data.checks, d.day, d.weekday, cursor.year, cursor.month) };
      }),
    [days, data.habits, data.checks, habitCount],
  );

  const perHabit = data.habits.map((h) =>
    habitProgress(h, data.checks[h.id] ?? [], cursor.year, cursor.month, total, availableDays),
  );
  const habitsDone = perHabit.reduce((s, p) => s + p.done, 0);
  const habitsPossible = perHabit.reduce((s, p) => s + p.possible, 0);
  // Average of per-habit percentages so every frequency type weighs equally.
  const habitPct = perHabit.length
    ? Math.min(100, Math.round(perHabit.reduce((s, p) => s + p.pct, 0) / perHabit.length))
    : 0;

  const goalsDone = data.goals.filter((g) => g.done).length;
  const goalPct = data.goals.length ? Math.round((goalsDone / data.goals.length) * 100) : 0;

  const overall = Math.round((habitPct + goalPct) / 2);

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-3">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
              GO Tracker
            </p>
            <p className="text-xs text-muted-foreground">Трекер привычек и целей</p>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                onClick={() => shift(-1)}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-olive hover:text-olive"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h1 className="min-w-0 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {MONTHS_RU[cursor.month]}{" "}
                <span className="text-muted-foreground">{cursor.year}</span>
              </h1>
              <button
                type="button"
                aria-label="Следующий месяц"
                onClick={() => shift(1)}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-olive hover:text-olive"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-olive hover:text-olive"
              >
                Текущий месяц
              </button>
            )}
            <AccountButton />
            <DataMenu
              data={data}
              fileLabel={`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`}
              onImport={store.replaceAll}
              onReset={store.resetProgress}
              readOnly={!store.loaded || store.blocked}
            />
          </div>
        </header>

        {store.error && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          <p>{store.error}</p>
          {store.blocked && <Button variant="outline" size="sm" onClick={() => window.location.reload()}><RotateCcw />Обновить страницу</Button>}
        </div>}
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiBlock
            label="Выполненные цели"
            value={`${goalsDone} / ${data.goals.length}`}
            percent={goalPct}
          />
          <KpiBlock
            label="Выполненные привычки"
            value={`${habitPct}%`}
            percent={habitPct}
            hint={`${habitsDone}/${habitsPossible}`}
          />
          <KpiBlock label="Общий прогресс" value={`${overall}%`} percent={overall} />
        </div>

        <fieldset disabled={!store.loaded || store.blocked} className="min-w-0 space-y-3 border-0 p-0">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,18rem)]">
          <GoalsPanel
            goals={data.goals}
            onToggle={store.toggleGoal}
            onAdd={store.addGoal}
            onUpdate={store.updateGoal}
            onRemove={store.removeGoal}
          />
          <ProductivityChart data={chartData} />
          <OverallDonut percent={overall} />
        </div>

        <HabitTracker
          habits={data.habits}
          days={days}
          checks={data.checks}
          availableDays={availableDays}
          year={cursor.year}
          month={cursor.month}
          onToggle={store.toggleCheck}
          onAdd={store.addHabit}
          onUpdate={store.updateHabit}
          onRemove={store.removeHabit}
        />
        </fieldset>
      </div>
    </main>
  );
}
