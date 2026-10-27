import { describe, expect, it } from 'vitest';
import { migrateLegacy, monthData, putHabit, readPlanner, STORAGE_KEY, validateMonth } from '../planner-persistence';
import { habitProgress, dayScore } from '../habit-progress';
import type { Habit, MonthData } from '../planner-store';

const gym: Habit = { id: 'h5', title: 'Мой спортзал', emoji: '💪', freq: { type: 'weekly', times: 3, days: [1,3,5] } };
const monthly: Habit = { id: 'custom', title: 'Книги', emoji: '📚', freq: { type: 'monthly', times: 8 } };
const october: MonthData = { habits: [gym, monthly], goals: [{ id: 'g1', title: 'Моя цель октября', done: true }], checks: { h5: [1,3,5], custom: [3,9] } };
const raw = JSON.stringify(october);
const migrate = () => migrateLegacy({ 'planner-go:2026-10': raw });

describe('safe monthly habit continuity', () => {
  it('migrates all configured October data and keeps a byte-for-byte backup', () => {
    const p = migrate();
    expect(p.legacyBackup['planner-go:2026-10']).toBe(raw);
    expect(monthData(p, 2026, 9)).toEqual({ ...october, habits: october.habits.map(h => ({ ...h, startDate: '2026-10-01' })) });
  });
  it('October habits and preferred weekdays continue into November and December', () => {
    const p = migrate();
    for (const m of [10,11]) {
      expect(monthData(p, 2026, m).habits.map(h => h.title)).toEqual(['Мой спортзал','Книги']);
      expect(monthData(p, 2026, m).habits[0]?.freq).toEqual({ type: 'weekly', times: 3, days: [1,3,5] });
    }
  });
  it('October completions do not appear in November', () => {
    expect(monthData(migrate(), 2026, 10).checks).toEqual({});
    expect(monthData(migrate(), 2026, 9).checks).toEqual(october.checks);
  });
  it('October goals do not roll over into November', () => {
    expect(monthData(migrate(), 2026, 10).goals).toEqual([]);
    expect(monthData(migrate(), 2026, 9).goals).toEqual(october.goals);
  });
  it('changing November frequency to 2 preserves October settings and progress', () => {
    const p = migrate();
    const before = monthData(p, 2026, 9);
    const oldHabit = before.habits[0];
    if (!oldHabit) throw new Error('Missing fixture');
    const edited = putHabit(p, { ...oldHabit, freq: { type: 'weekly', times: 2, days: [2,4] } }, '2026-11-01');
    expect(monthData(edited, 2026, 9)).toEqual(before);
    expect(habitProgress(monthData(edited, 2026, 9).habits[0] ?? gym, [1,3,5], 2026,9,31,31)).toEqual(habitProgress(oldHabit,[1,3,5],2026,9,31,31));
    expect(monthData(edited, 2026, 10).habits[0]?.freq).toEqual({ type:'weekly', times:2, days:[2,4] });
  });
  it('ending November 15 hides the habit in December without losing October', () => {
    const p = putHabit(migrate(), { ...gym, startDate:'2026-10-01', endDate:'2026-11-15' }, '2026-11-01');
    expect(monthData(p,2026,10).habits.some(h=>h.id==='h5')).toBe(true);
    expect(monthData(p,2026,11).habits.some(h=>h.id==='h5')).toBe(false);
    expect(monthData(p,2026,9).checks).toEqual(october.checks);
  });
  it('termination keeps an earlier revision and allows reload of a same-month new habit', () => {
    const p = putHabit(migrate(), gym, '2026-10-01', true);
    expect(monthData(p,2026,9).habits.map(h=>h.id)).toEqual(['custom']);
    expect(p.months['2026-10']?.checks['h5']).toEqual([1,3,5]);
  });
  it('refresh and October-November-October preserve records without writing legacy keys', () => {
    const values = new Map([['planner-go:2026-10', raw]]);
    const storage = { get length() { return values.size; }, key: (i:number) => [...values.keys()][i] ?? null, getItem: (k:string) => values.get(k) ?? null, setItem: (k:string,v:string) => { values.set(k,v); } } as Storage;
    const p = readPlanner(storage);
    expect(values.has(STORAGE_KEY)).toBe(true);
    const before = monthData(p,2026,9);
    monthData(p,2026,10);
    expect(monthData(readPlanner(storage),2026,9)).toEqual(before);
    expect(values.get('planner-go:2026-10')).toBe(raw);
  });
  it('empty storage creates no demo habits or goals', () => {
    expect(monthData(migrateLegacy({}),2026,9)).toEqual({ habits:[], goals:[], checks:{} });
  });
  it('malformed legacy data aborts migration instead of replacing it with defaults', () => {
    expect(()=>migrateLegacy({ 'planner-go:2026-10': raw, 'planner-go:2026-11':'{broken' })).toThrow();
    expect(()=>validateMonth({ habits:[gym,gym], goals:[], checks:{} })).toThrow();
  });
});

describe('active periods and progress invariants', () => {
  it('daily October 10-15 counts exactly 6 applicable days', () => {
    const h = { ...gym, freq: { type:'daily' as const }, startDate:'2026-10-10',endDate:'2026-10-15' };
    expect(habitProgress(h,[1,10,12,15,20],2026,9,31,31)).toEqual({ done:3,possible:6,pct:50 });
  });
  it('future completions and days are excluded', () => {
    const h = { ...gym, freq:{ type:'daily' as const }, startDate:'2026-10-10' };
    expect(habitProgress(h,[10,11,20],2026,9,31,11)).toEqual({ done:2,possible:2,pct:100 });
    expect(habitProgress(h,[10],2026,9,31,0)).toEqual({ done:0,possible:0,pct:0 });
  });
  it('monthly 8 target with 2 applicable checks remains 25%', () => {
    expect(habitProgress({ ...monthly, startDate:'2026-10-03',endDate:'2026-10-09' },[1,3,9,20],2026,9,31,31).pct).toBe(25);
  });
  it('weekly targets prorate only active days at the month boundary and cap at 100', () => {
    const h = { ...gym, startDate:'2026-10-30' };
    expect(habitProgress(h,[1,30,31],2026,9,31,31)).toEqual({ done:1,possible:1,pct:100 });
  });
  it('daily productivity ignores inactive habits but counts off-plan completions', () => {
    expect(dayScore([{ ...gym,startDate:'2026-10-10' }],{ h5:[1] },1,4,2026,9)).toBe(0);
    expect(dayScore([gym],{ h5:[6] },6,2,2026,9)).toBe(100);
  });
});