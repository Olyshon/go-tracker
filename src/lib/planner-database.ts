import type { Tables } from '@/integrations/supabase/types';
import { emptyPlanner, validateMonth, type PlannerData } from './planner-persistence';
import type { HabitFrequency } from './planner-store';

export type TrackerRows = {
  revision: number;
  habits: Tables<'habits'>[];
  revisions: Tables<'habit_revisions'>[];
  completions: Tables<'habit_completions'>[];
  goals: Tables<'monthly_goals'>[];
};

// Translate normalized database rows to the existing calculation/UI contract.
// Browser history is deliberately never read or imported here.
export function plannerFromRows(rows: TrackerRows): PlannerData {
  const planner = emptyPlanner();
  for (const row of rows.revisions) {
    const habit = {
      id: row.habit_id, title: row.title, emoji: row.emoji,
      freq: row.frequency as HabitFrequency,
      startDate: row.start_date ?? undefined, endDate: row.end_date ?? undefined,
    };
    validateMonth({ habits: [habit], goals: [], checks: {} });
    (planner.habits[habit.id] ??= []).push({ from: row.effective_from, habit, ended: row.ended });
  }
  for (const row of rows.goals) {
    const month = row.month.slice(0, 7);
    const data = planner.months[month] ??= { goals: [], checks: {} };
    data.goals.push({ id: row.id, title: row.title, done: row.done });
  }
  for (const row of rows.completions) {
    const month = row.completed_on.slice(0, 7);
    const data = planner.months[month] ??= { goals: [], checks: {} };
    (data.checks[row.habit_id] ??= []).push(Number(row.completed_on.slice(8, 10)));
  }
  return planner;
}

export function validatePlannerForDatabase(planner: PlannerData) {
  for (const revisions of Object.values(planner.habits)) {
    for (const revision of revisions) validateMonth({ habits: [revision.habit], goals: [], checks: {} });
  }
  for (const [month, data] of Object.entries(planner.months)) {
    validateMonth({ habits: [], ...data });
    const total = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();
    for (const [id, days] of Object.entries(data.checks)) {
      if (!planner.habits[id] || days.some(day => day > total)) throw new Error('Некорректные отметки месяца');
    }
  }
}