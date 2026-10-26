import type { Habit, HabitFrequency } from "./planner-store";

export const freqOf = (h: Habit): HabitFrequency => h.freq ?? { type: "daily" };

/** Is the habit planned on this JS weekday (0=Sun)? Monthly habits have no daily plan. */
export function isPlanned(h: Habit, weekday: number): boolean {
  const f = freqOf(h);
  if (f.type === "daily") return true;
  if (f.type === "weekly") return !!f.days?.length && f.days.includes(weekday);
  return false;
}

export type Progress = { done: number; possible: number; pct: number };

const pctOf = (done: number, possible: number) =>
  possible > 0 ? Math.max(0, Math.min(100, Math.round((done / possible) * 100))) : 0;

/** Calendar weeks (Mon–Sun) clipped to the month: arrays of day numbers. */
export function monthWeeks(year: number, month: number, total: number): number[][] {
  const weeks: number[][] = [];
  let cur: number[] = [];
  for (let d = 1; d <= total; d++) {
    const wd = new Date(year, month, d).getDay();
    if (wd === 1 && cur.length) {
      weeks.push(cur);
      cur = [];
    }
    cur.push(d);
  }
  if (cur.length) weeks.push(cur);
  return weeks;
}

/**
 * @param elapsed number of days counted so far (today inclusive for current month,
 *   full month for past, 0 for future months).
 */
export function habitProgress(
  h: Habit,
  checked: number[],
  year: number,
  month: number,
  total: number,
  elapsed: number,
): Progress {
  const f = freqOf(h);
  const doneIn = (days: number[]) => checked.filter((d) => days.includes(d)).length;

  if (f.type === "daily") {
    const done = checked.filter((d) => d <= elapsed).length;
    return { done, possible: elapsed, pct: pctOf(done, elapsed) };
  }

  if (f.type === "monthly") {
    const target = Math.max(1, f.times);
    const done = Math.min(checked.length, target);
    return { done, possible: target, pct: pctOf(done, target) };
  }

  // weekly
  const times = Math.max(1, Math.min(7, f.times));
  let done = 0;
  let possible = 0;
  for (const week of monthWeeks(year, month, total)) {
    const elapsedDays = week.filter((d) => d <= elapsed);
    if (!elapsedDays.length) continue;
    // Partial calendar week at month boundary: prorate target by its length.
    const weekTarget = Math.min(times, week.length, Math.max(1, Math.round((times * week.length) / 7)));
    // Week in progress: expect only the share of the target for elapsed days (floored),
    // so remaining days are never counted as missed; completions already made always count.
    const actual = doneIn(week);
    const inProgress = elapsedDays.length < week.length;
    const expected = inProgress
      ? Math.max(Math.min(actual, weekTarget), Math.floor((weekTarget * elapsedDays.length) / week.length))
      : weekTarget;
    if (expected <= 0) continue;
    done += Math.min(actual, expected);
    possible += expected;
  }
  return { done, possible, pct: pctOf(done, possible) };
}

/** Daily productivity: completions vs planned habits that day, capped at 100. */
export function dayScore(habits: Habit[], checks: Record<string, number[]>, day: number, weekday: number) {
  const planned = habits.filter((h) => isPlanned(h, weekday));
  const doneAll = habits.filter((h) => (checks[h.id] ?? []).includes(day)).length;
  if (planned.length) return Math.min(100, Math.round((doneAll / planned.length) * 100));
  return doneAll > 0 ? 100 : 0;
}

export function freqLabel(h: Habit): string {
  const f = freqOf(h);
  if (f.type === "daily") return "каждый день";
  if (f.type === "weekly") return `${f.times}× в неделю`;
  return `${f.times}× в месяц`;
}
