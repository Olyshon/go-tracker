import { useCallback, useEffect, useState } from "react";

export type Goal = { id: string; title: string; done: boolean };
export type HabitFrequency =
  | { type: "daily" }
  /** days: preferred JS weekdays (0=Sun), suggestions only */
  | { type: "weekly"; times: number; days?: number[] }
  | { type: "monthly"; times: number };
/** freq is optional: legacy habits without it are daily. */
export type Habit = { id: string; title: string; emoji: string; freq?: HabitFrequency };
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

const DEFAULT_GOALS: Goal[] = [
  "Достичь дзен",
  "Вести финансовый учёт",
  "Планирование каждого воскресенья",
  "Завершить проект",
  "Защитить таблицу",
  "Убрать тревожность",
].map((title, i) => ({ id: `g${i + 1}`, title, done: false }));

const emptyMonth = (): MonthData => ({
  goals: DEFAULT_GOALS.map((g) => ({ ...g })),
  habits: DEFAULT_HABITS.map((h) => ({ ...h })),
  checks: {},
});

const keyFor = (year: number, month: number) =>
  `planner-go:${year}-${String(month + 1).padStart(2, "0")}`;

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function useMonthData(year: number, month: number) {
  const [data, setData] = useState<MonthData>(emptyMonth);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(keyFor(year, month));
      setData(raw ? (JSON.parse(raw) as MonthData) : emptyMonth());
    } catch {
      setData(emptyMonth());
    }
    setLoaded(true);
  }, [year, month]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    window.localStorage.setItem(keyFor(year, month), JSON.stringify(data));
  }, [data, loaded, year, month]);

  const toggleCheck = useCallback((habitId: string, day: number) => {
    setData((d) => {
      const cur = d.checks[habitId] ?? [];
      const next = cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day].sort((a, b) => a - b);
      return { ...d, checks: { ...d.checks, [habitId]: next } };
    });
  }, []);

  const addHabit = useCallback((title: string, emoji: string) => {
    setData((d) => ({ ...d, habits: [...d.habits, { id: uid(), title, emoji }] }));
  }, []);

  const updateHabit = useCallback((id: string, title: string, emoji: string) => {
    setData((d) => ({
      ...d,
      habits: d.habits.map((h) => (h.id === id ? { ...h, title, emoji } : h)),
    }));
  }, []);

  const removeHabit = useCallback((id: string) => {
    setData((d) => {
      const checks = { ...d.checks };
      delete checks[id];
      return { ...d, habits: d.habits.filter((h) => h.id !== id), checks };
    });
  }, []);

  const addGoal = useCallback((title: string) => {
    setData((d) => ({ ...d, goals: [...d.goals, { id: uid(), title, done: false }] }));
  }, []);

  const updateGoal = useCallback((id: string, title: string) => {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, title } : g)) }));
  }, []);

  const toggleGoal = useCallback((id: string) => {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
  }, []);

  const replaceAll = useCallback((next: MonthData) => {
    setData({
      goals: Array.isArray(next.goals) ? next.goals : [],
      habits: Array.isArray(next.habits) ? next.habits : [],
      checks: next.checks && typeof next.checks === "object" ? next.checks : {},
    });
  }, []);

  const resetProgress = useCallback(() => {
    setData((d) => ({
      ...d,
      checks: {},
      goals: d.goals.map((g) => ({ ...g, done: false })),
    }));
  }, []);

  return {
    data,
    loaded,
    replaceAll,
    resetProgress,
    toggleCheck,
    addHabit,
    updateHabit,
    removeHabit,
    addGoal,
    updateGoal,
    toggleGoal,
    removeGoal,
  };
}
