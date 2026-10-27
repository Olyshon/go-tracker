import type { Habit } from './planner-store';

export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;
export function isActive(h: Habit, year: number, month: number, day: number) {
  const date = dateKey(new Date(year, month, day));
  return (!h.startDate || date >= h.startDate) && (!h.endDate || date <= h.endDate);
}