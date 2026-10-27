import { useCallback, useEffect, useMemo, useState } from "react";

import { dateKey, monthKey } from './habit-dates';
import { emptyPlanner, monthData, putHabit, readPlanner, STORAGE_KEY, validateMonth, type PlannerData } from './planner-persistence';

export type Goal = { id: string; title: string; done: boolean };
export type HabitFrequency =
  | { type: "daily" }
  /** days: preferred JS weekdays (0=Sun), suggestions only */
  | { type: "weekly"; times: number; days?: number[] }
  | { type: "monthly"; times: number };
/** freq is optional: legacy habits without it are daily. */
export type Habit = { id: string; title: string; emoji: string; freq?: HabitFrequency | undefined; startDate?: string; endDate?: string };
export type MonthData = {
  goals: Goal[];
  habits: Habit[];
  /** habitId -> array of day numbers (1-based) completed */
  checks: Record<string, number[]>;
};

export const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export const WEEKDAYS_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_HABITS: Habit[] = [
  { id: "h1", title: "Подъём в 7:30", emoji: "⏰" },
  { id: "h2", title: "Пробежка", emoji: "🏃" },
  { id: "h3", title: "Контрастный душ", emoji: "🚿" },
  { id: "h4", title: "Завтрак", emoji: "🥣" },
  { id: "h5", title: "Спортзал", emoji: "💪" },
  { id: "h6", title: "Работа над проектом", emoji: "🎯" },
  { id: "h7", title: "Отказ от соцсетей", emoji: "📱" },
  { id: "h8", title: "Ведение бюджета", emoji: "💰" },
  { id: "h9", title: "Чтение / Обучение", emoji: "📚" },
  { id: "h10", title: "Планирование недели", emoji: "📅" },
  { id: "h11", title: "Медитация", emoji: "🧘" },
  { id: "h12", title: "Ложиться спать до 22:00", emoji: "🛏️" },
];

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function useMonthData(year: number, month: number) {
  const [planner, setPlanner] = useState<PlannerData>(emptyPlanner);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try { setPlanner(readPlanner(window.localStorage)); setLoaded(true); }
    catch { setError('Не удалось безопасно прочитать данные. Исходные записи сохранены; изменения заблокированы.'); }
  }, []);
  const data = useMemo(() => monthData(planner, year, month), [planner, year, month]);
  const key = monthKey(year, month);
  const commit = useCallback((change: (p: PlannerData) => PlannerData) => {
    if (!loaded) return;
    setPlanner(p => {
      const next = change(p);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setError(''); return next; }
      catch { setError('Не удалось сохранить изменения. Освободите место в браузере и попробуйте снова.'); return p; }
    });
  }, [loaded]);
  const changeMonth = useCallback((change: (d: MonthData) => MonthData) => commit(p => {
    const next = change(monthData(p, year, month));
    return { ...p, months: { ...p.months, [key]: { goals: next.goals, checks: next.checks } } };
  }), [commit, year, month, key]);
  const toggleCheck = (id: string, day: number) => changeMonth(d => {
    const cur = d.checks[id] ?? [];
    return { ...d, checks: { ...d.checks, [id]: cur.includes(day) ? cur.filter(x => x !== day) : [...cur, day].sort((a,b) => a-b) } };
  });
  const addHabit = (title: string, emoji: string, freq?: HabitFrequency, startDate = dateKey(new Date()), endDate?: string) => {
    const habit = { id: uid(), title, emoji, freq, startDate, endDate };
    commit(p => putHabit(p, habit, `${startDate.slice(0,7)}-01`));
  };
  const updateHabit = (id: string, title: string, emoji: string, freq?: HabitFrequency, startDate?: string, endDate?: string) => commit(p => {
    const old = monthData(p, year, month).habits.find(h => h.id === id);
    if (!old) return p;
    return putHabit(p, { ...old, title, emoji, freq, startDate, endDate }, `${key}-01`);
  });
  // Ending replaces destructive deletion; earlier revisions and all checks remain intact.
  const removeHabit = (id: string) => commit(p => {
    const old = monthData(p, year, month).habits.find(h => h.id === id);
    return old ? putHabit(p, old, `${key}-01`, true) : p;
  });
  const addGoal = (title: string) => changeMonth(d => ({ ...d, goals: [...d.goals, { id: uid(), title, done: false }] }));
  const updateGoal = (id: string, title: string) => changeMonth(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, title } : g) }));
  const toggleGoal = (id: string) => changeMonth(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) }));
  const removeGoal = (id: string) => changeMonth(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }));
  const replaceAll = (input: MonthData) => {
    const next = validateMonth(input);
    commit(p => {
      let result = p;
      for (const h of next.habits) result = putHabit(result, { ...h, startDate: h.startDate ?? `${key}-01` }, `${key}-01`);
      return { ...result, months: { ...result.months, [key]: { goals: next.goals, checks: next.checks } } };
    });
  };
  const resetProgress = () => changeMonth(d => ({ ...d, checks: {}, goals: d.goals.map(g => ({ ...g, done: false })) }));
  return { data, loaded, error, replaceAll, resetProgress, toggleCheck, addHabit, updateHabit, removeHabit, addGoal, updateGoal, toggleGoal, removeGoal };
}
