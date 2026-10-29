import type { Habit, MonthData } from './planner-store';
import { dateKey, isActive, monthKey } from './habit-dates';

export const STORAGE_KEY = 'go-tracker:v2';
type Revision = { from: string; habit: Habit; ended?: boolean };
export type PlannerData = {
  version: 2;
  habits: Record<string, Revision[]>;
  months: Record<string, { goals: MonthData['goals']; checks: MonthData['checks'] }>;
  legacyBackup: Record<string, string>;
};
export const emptyPlanner = (): PlannerData => ({ version: 2, habits: {}, months: {}, legacyBackup: {} });

export function validateMonth(value: unknown): MonthData {
  if (!value || typeof value !== 'object') throw new Error('Некорректный файл месяца');
  const d = value as MonthData;
  if (!Array.isArray(d.habits) || !Array.isArray(d.goals) || !d.checks || typeof d.checks !== 'object' || Array.isArray(d.checks)) throw new Error('Некорректный файл месяца');
  if (new Set(d.habits.map(h => h?.id)).size !== d.habits.length || new Set(d.goals.map(g => g?.id)).size !== d.goals.length) throw new Error('Повторяющиеся идентификаторы');
  for (const h of d.habits) {
    if (!h || typeof h.id !== 'string' || typeof h.title !== 'string' || typeof h.emoji !== 'string') throw new Error('Некорректная привычка');
    if (h.freq && !(h.freq.type === 'daily' || ((h.freq.type === 'weekly' || h.freq.type === 'monthly') && Number.isFinite(h.freq.times) && h.freq.times >= 1))) throw new Error('Некорректная частота');
    if (h.freq?.type === 'weekly' && h.freq.days && (!Array.isArray(h.freq.days) || h.freq.days.some(d => !Number.isInteger(d) || d < 0 || d > 6))) throw new Error('Некорректные дни недели');
    for (const date of [h.startDate, h.endDate]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dateKey(new Date(`${date}T12:00:00`)) !== date)) throw new Error('Некорректная дата');
    if (h.startDate && h.endDate && h.endDate < h.startDate) throw new Error('Дата окончания раньше начала');
  }
  for (const g of d.goals) if (!g || typeof g.id !== 'string' || typeof g.title !== 'string' || typeof g.done !== 'boolean') throw new Error('Некорректная цель');
  for (const days of Object.values(d.checks)) if (!Array.isArray(days) || days.some(day => !Number.isInteger(day) || day < 1 || day > 31)) throw new Error('Некорректные отметки');
  return d;
}

// Legacy keys are never changed. Validate every month before producing a migration.
export function migrateLegacy(entries: Record<string, string>): PlannerData {
  const result = emptyPlanner();
  for (const key of Object.keys(entries).filter(k => /^planner-go:\d{4}-\d{2}$/.test(k)).sort()) {
    const raw = entries[key];
    if (raw === undefined) continue;
    const data = validateMonth(JSON.parse(raw));
    const month = key.slice('planner-go:'.length);
    result.legacyBackup[key] = raw;
    result.months[month] = { goals: data.goals, checks: data.checks };
    // A monthly snapshot's omissions are not explicit terminations.
    for (const habit of data.habits) {
      const revisions = result.habits[habit.id] ?? [];
      const previous = revisions.at(-1)?.habit;
      const startDate = habit.startDate ?? revisions[0]?.habit.startDate ?? `${month}-01`;
      // Old monthly snapshots often contain the original daily defaults. There
      // is no edit timestamp to justify replacing a configured richer schedule.
      const freq = previous?.freq && previous.freq.type !== 'daily' && (!habit.freq || habit.freq.type === 'daily')
        ? previous.freq : habit.freq;
      revisions.push({ from: `${month}-01`, habit: { ...habit, freq, startDate, endDate: habit.endDate ?? previous?.endDate } });
      result.habits[habit.id] = revisions;
    }
  }
  return result;
}

export function readPlanner(storage: Storage): PlannerData {
  const existing = storage.getItem(STORAGE_KEY);
  if (existing) {
    const parsed = JSON.parse(existing) as PlannerData;
    if (parsed.version !== 2 || !parsed.habits || !parsed.months || !parsed.legacyBackup) throw new Error('Не удалось прочитать сохранённые данные');
    if (typeof parsed.habits !== 'object' || Array.isArray(parsed.habits) || typeof parsed.months !== 'object' || Array.isArray(parsed.months) || typeof parsed.legacyBackup !== 'object' || Array.isArray(parsed.legacyBackup)) throw new Error('Некорректный реестр');
    for (const revisions of Object.values(parsed.habits)) {
      if (!Array.isArray(revisions)) throw new Error('Некорректная история привычек');
      for (const revision of revisions) {
        if (!revision || typeof revision.from !== 'string' || !/^\d{4}-\d{2}-01$/.test(revision.from) || dateKey(new Date(`${revision.from}T12:00:00`)) !== revision.from || (revision.ended !== undefined && typeof revision.ended !== 'boolean')) throw new Error('Некорректная дата изменения');
        validateMonth({ habits: [revision.habit], goals: [], checks: {} });
      }
    }
    for (const [key, month] of Object.entries(parsed.months)) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error('Некорректный месяц');
      validateMonth({ habits: [], ...month });
    }
    if (Object.values(parsed.legacyBackup).some(raw => typeof raw !== 'string')) throw new Error('Некорректная резервная копия');
    return parsed;
  }
  const entries: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith('planner-go:')) {
      const raw = storage.getItem(key);
      if (raw !== null) entries[key] = raw;
    }
  }
  const migrated = migrateLegacy(entries);
  storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function monthData(planner: PlannerData, year: number, month: number): MonthData {
  const key = monthKey(year, month);
  const end = dateKey(new Date(year, month + 1, 0));
  const habits = Object.values(planner.habits).flatMap(revisions => {
    const revision = revisions.filter(r => r.from <= end).sort((a, b) => a.from.localeCompare(b.from)).at(-1);
    const h = revision?.ended ? undefined : revision?.habit;
    return h && Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1).some(d => isActive(h, year, month, d)) ? [h] : [];
  });
  return { habits, goals: planner.months[key]?.goals ?? [], checks: planner.months[key]?.checks ?? {} };
}

export function putHabit(planner: PlannerData, habit: Habit, from: string, ended = false): PlannerData {
  const revisions = (planner.habits[habit.id] ?? []).filter(r => r.from !== from);
  return { ...planner, habits: { ...planner.habits, [habit.id]: [...revisions, { from, habit, ended }].sort((a, b) => a.from.localeCompare(b.from)) } };
}