import type { Habit, MonthData } from './planner-store';
import { dateKey, isActive, monthKey } from './habit-dates';

export const STORAGE_KEY = 'go-tracker:v2';
type Revision = { from: string; habit: Habit };
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
    // An absence in an existing month is also historical information.
    for (const [id, revisions] of Object.entries(result.habits)) {
      const last = revisions.at(-1);
      if (last && !data.habits.some(h => h.id === id)) {
        const [y, m] = month.split('-').map(Number);
        revisions.push({ from: `${month}-01`, habit: { ...last.habit, endDate: dateKey(new Date(y ?? 2026, (m ?? 1) - 1, 0)) } });
      }
    }
    for (const habit of data.habits) {
      const revisions = result.habits[habit.id] ?? [];
      const startDate = habit.startDate ?? revisions[0]?.habit.startDate ?? `${month}-01`;
      revisions.push({ from: `${month}-01`, habit: { ...habit, startDate } });
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
    for (const revisions of Object.values(parsed.habits)) {
      if (!Array.isArray(revisions)) throw new Error('Некорректная история привычек');
      for (const revision of revisions) validateMonth({ habits: [revision.habit], goals: [], checks: {} });
    }
    for (const month of Object.values(parsed.months)) validateMonth({ habits: [], ...month });
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
    const h = revisions.filter(r => r.from <= end).sort((a, b) => a.from.localeCompare(b.from)).at(-1)?.habit;
    return h && Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1).some(d => isActive(h, year, month, d)) ? [h] : [];
  });
  return { habits, goals: planner.months[key]?.goals ?? [], checks: planner.months[key]?.checks ?? {} };
}

export function putHabit(planner: PlannerData, habit: Habit, from: string): PlannerData {
  const revisions = (planner.habits[habit.id] ?? []).filter(r => r.from !== from);
  return { ...planner, habits: { ...planner.habits, [habit.id]: [...revisions, { from, habit }].sort((a, b) => a.from.localeCompare(b.from)) } };
}