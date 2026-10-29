import { describe, expect, it } from 'vitest';
import { CONFLICT_MESSAGE, LEGACY_MESSAGE, LOCK_MESSAGE, PlannerSession } from '../planner-session';
import { migrateLegacy, monthData, putHabit, readPlanner, STORAGE_KEY } from '../planner-persistence';
import type { Habit, MonthData } from '../planner-store';

const weekly: Habit = { id: 'run', title: 'Пробежка', emoji: '🏃', freq: { type: 'weekly', times: 3, days: [1, 3, 5] }, startDate: '2026-10-10' };
const monthly: Habit = { id: 'psy', title: 'Психолог', emoji: '🌿', freq: { type: 'monthly', times: 2 }, startDate: '2026-10-01', endDate: '2026-12-15' };
const october: MonthData = { habits: [weekly, monthly], goals: [{ id: 'goal', title: 'Защитить таблицу', done: true }], checks: { run: [10, 12], psy: [14] } };
const legacy = 'planner-go:2026-10';
const raw = JSON.stringify(october);
function storageFixture(entries: Record<string, string> = { [legacy]: raw }) {
  const values = new Map(Object.entries(entries));
  const writes: string[] = [];
  const storage = { get length() { return values.size; }, key: (i: number) => [...values.keys()][i] ?? null, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); values.set(k, v); } } as Storage;
  return { storage, writes, values };
}
function serialLocks() {
  let queue: Promise<unknown> = Promise.resolve();
  return { request<T>(_name: string, callback: () => T | Promise<T>): Promise<T> {
    const result = queue.then(callback);
    queue = result.catch(() => {});
    return result;
  } };
}

describe('safe migration and continuity', () => {
  it('missing habits in legacy November do not terminate October habits', () => {
    const p = migrateLegacy({ [legacy]: raw, 'planner-go:2026-11': JSON.stringify({ habits: [], goals: [], checks: {} }) });
    expect(monthData(p, 2026, 10).habits).toEqual([weekly, monthly]);
    expect(monthData(p, 2026, 11).habits).toEqual([weekly, monthly]);
    expect(p.legacyBackup[legacy]).toBe(raw);
    expect(p.habits['run']?.some(r => r.ended)).toBe(false);
  });
  it('older daily defaults cannot override weekly/monthly settings or dates', () => {
    const defaults = october.habits.map(({ startDate: _start, endDate: _end, ...h }) => ({ ...h, freq: { type: 'daily' } }));
    const p = migrateLegacy({ [legacy]: raw, 'planner-go:2026-11': JSON.stringify({ habits: defaults, goals: [], checks: {} }) });
    expect(monthData(p, 2026, 10).habits).toEqual([weekly, monthly]);
    expect(monthData(p, 2026, 9)).toEqual(october);
  });
  it('selected-month frequency edits leave historical settings and completions intact', () => {
    const before = migrateLegacy({ [legacy]: raw });
    const changed = putHabit(before, { ...weekly, freq: { type: 'weekly', times: 2, days: [2, 4] } }, '2026-11-01');
    expect(monthData(changed, 2026, 9)).toEqual(october);
    expect(monthData(changed, 2026, 10).habits[0]?.freq).toEqual({ type: 'weekly', times: 2, days: [2, 4] });
    expect(monthData(changed, 2026, 11).habits[0]?.freq).toEqual({ type: 'weekly', times: 2, days: [2, 4] });
    expect(monthData(changed, 2026, 10).checks).toEqual({});
    expect(monthData(changed, 2026, 10).goals).toEqual([]);
  });
  it('inclusive start/end periods and explicit termination retain earlier history', () => {
    const p = migrateLegacy({ [legacy]: raw });
    expect(monthData(p, 2026, 8).habits).toEqual([]);
    expect(monthData(p, 2026, 11).habits.map(h => h.id)).toEqual(['run', 'psy']);
    expect(monthData(p, 2027, 0).habits.map(h => h.id)).toEqual(['run']);
    const ended = putHabit(p, weekly, '2026-11-01', true);
    expect(monthData(ended, 2026, 10).habits.map(h => h.id)).toEqual(['psy']);
    expect(monthData(ended, 2026, 9)).toEqual(october);
  });
});

describe('serialized browser persistence', () => {
  it('reload and October-November-October navigation preserve saved goals and checks', async () => {
    const { storage, values } = storageFixture();
    const locks = serialLocks();
    const session = new PlannerSession(storage, locks);
    await session.initialize();
    await session.commit(p => ({ ...p, months: { ...p.months, '2026-10': { goals: october.goals, checks: { run: [10, 12, 15], psy: [14] } } } }));
    const reloaded = (await new PlannerSession(storage, locks).initialize()).planner;
    const before = monthData(reloaded, 2026, 9);
    expect(before.checks['run']).toEqual([10, 12, 15]);
    expect(before.goals).toEqual(october.goals);
    expect(monthData(reloaded, 2026, 10)).toEqual({ habits: [weekly, monthly], goals: [], checks: {} });
    expect(monthData(reloaded, 2026, 9)).toEqual(before);
    expect(values.get(legacy)).toBe(raw);
    expect(reloaded.legacyBackup[legacy]).toBe(raw);
  });
  it('repeated/concurrent initialization writes a new registry only once', async () => {
    const { storage, writes } = storageFixture();
    const locks = serialLocks();
    const results = await Promise.all([new PlannerSession(storage, locks).initialize(), new PlannerSession(storage, locks).initialize()]);
    const saved = storage.getItem(STORAGE_KEY);
    await new PlannerSession(storage, locks).initialize();
    readPlanner(storage);
    expect(writes).toEqual([STORAGE_KEY]);
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    expect(results[0]?.planner).toEqual(results[1]?.planner);
  });
  it('stale simultaneous writes reject the second snapshot and keep newer data', async () => {
    const { storage } = storageFixture();
    const locks = serialLocks();
    const a = new PlannerSession(storage, locks);
    const b = new PlannerSession(storage, locks);
    await Promise.all([a.initialize(), b.initialize()]);
    const outcomes = await Promise.allSettled([
      a.commit(p => ({ ...p, months: { ...p.months, '2026-11': { goals: [{ id: 'new', title: 'Новая цель', done: false }], checks: {} } } })),
      b.commit(p => putHabit(p, { ...weekly, title: 'Устаревшее изменение' }, '2026-11-01')),
    ]);
    expect(outcomes[0]?.status).toBe('fulfilled');
    expect(outcomes[1]?.status).toBe('rejected');
    expect(b.checkForConflict()).toBe(CONFLICT_MESSAGE);
    const stored = readPlanner(storage);
    expect(stored.months['2026-11']?.goals[0]?.id).toBe('new');
    expect(monthData(stored, 2026, 10).habits[0]?.title).toBe('Пробежка');
    await expect(b.commit(p => p)).rejects.toThrow(CONFLICT_MESSAGE);
    expect((await new PlannerSession(storage, locks).initialize()).error).toBe('');
  });
  it('rapid changes from the same tab use the latest committed state', async () => {
    const { storage } = storageFixture();
    const session = new PlannerSession(storage, serialLocks());
    await session.initialize();
    const add = (id: string) => session.commit(p => ({ ...p, months: { ...p.months, '2026-11': { checks: {}, goals: [...(p.months['2026-11']?.goals ?? []), { id, title: id, done: false }] } } }));
    await Promise.all([add('one'), add('two')]);
    expect(readPlanner(storage).months['2026-11']?.goals.map(g => g.id)).toEqual(['one', 'two']);
  });
  it.each(['planner-go:2026-11', legacy])('late legacy %s blocks edits without rewriting or merging', async key => {
    const { storage, writes } = storageFixture();
    const locks = serialLocks();
    await new PlannerSession(storage, locks).initialize();
    const saved = storage.getItem(STORAGE_KEY);
    const late = JSON.stringify({ ...october, goals: [] });
    storage.setItem(key, late);
    const session = new PlannerSession(storage, locks);
    const result = await session.initialize();
    expect(result.error).toBe(LEGACY_MESSAGE);
    const count = writes.length;
    await expect(session.commit(p => p)).rejects.toThrow(LEGACY_MESSAGE);
    expect(writes.length).toBe(count);
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    expect(storage.getItem(key)).toBe(late);
    expect(result.planner.legacyBackup[legacy]).toBe(raw);
  });
  it('external registry deletion/change is detected before a write', async () => {
    const { storage, values } = storageFixture();
    const session = new PlannerSession(storage, serialLocks());
    await session.initialize();
    values.delete(STORAGE_KEY);
    await expect(session.commit(p => p)).rejects.toThrow(CONFLICT_MESSAGE);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('unsupported locks never write migrations or edits', async () => {
    const { storage, writes } = storageFixture();
    const session = new PlannerSession(storage, undefined);
    expect((await session.initialize()).error).toBe(LOCK_MESSAGE);
    await expect(session.commit(p => p)).rejects.toThrow(LOCK_MESSAGE);
    expect(writes).toEqual([]);
  });
  it('malformed existing registry stays untouched', async () => {
    const { storage, writes } = storageFixture({ [STORAGE_KEY]: '{broken', [legacy]: raw });
    await expect(new PlannerSession(storage, serialLocks()).initialize()).rejects.toThrow();
    expect(storage.getItem(STORAGE_KEY)).toBe('{broken');
    expect(writes).toEqual([]);
  });
  it('empty initialization creates no demo habits or monthly goals', async () => {
    const { storage } = storageFixture({});
    const p = (await new PlannerSession(storage, serialLocks()).initialize()).planner;
    expect(monthData(p, 2026, 9)).toEqual({ habits: [], goals: [], checks: {} });
    expect(monthData(p, 2026, 10)).toEqual({ habits: [], goals: [], checks: {} });
  });
});