import { readPlanner, STORAGE_KEY, type PlannerData } from './planner-persistence';

export const PLANNER_LOCK = 'go-tracker:persistence';
export const CONFLICT_MESSAGE = 'Данные изменились в другой вкладке. Последнее действие не сохранено. Обновите страницу перед дальнейшими изменениями.';
export const LEGACY_MESSAGE = 'Найдены старые записи, не включённые в реестр. Изменения заблокированы; обе версии сохранены. Сделайте полную резервную копию перед согласованием данных.';
export const LOCK_MESSAGE = 'Этот браузер не поддерживает безопасное сохранение между вкладками. Изменения заблокированы. Откройте приложение в современном браузере.';
type Locks = { request<T>(name: string, callback: () => T | Promise<T>): Promise<T> };

export function trackerSnapshot(storage: Storage): string {
  const entries: Record<string, string | null> = { [STORAGE_KEY]: storage.getItem(STORAGE_KEY) };
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && /^planner-go:\d{4}-\d{2}$/.test(key)) entries[key] = storage.getItem(key);
  }
  return JSON.stringify(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

export function hasLateLegacy(storage: Storage, planner: PlannerData): boolean {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && /^planner-go:\d{4}-\d{2}$/.test(key) && storage.getItem(key) !== planner.legacyBackup[key]) return true;
  }
  return false;
}

// All participating tabs serialize initialization and read-check-write under
// one origin-scoped Web Lock. Exact raw comparisons detect older app writers.
export class PlannerSession {
  private snapshot = '';
  private planner: PlannerData | undefined;
  private blocked = '';

  constructor(private storage: Storage, private locks: Locks | undefined) {}

  async initialize(): Promise<{ planner: PlannerData; error: string }> {
    if (!this.locks) {
      // Read-only storage facade: never persist a migration without a lock.
      const storage = this.storage;
      const readOnly = { get length() { return storage.length; }, key: (i: number) => storage.key(i), getItem: (key: string) => storage.getItem(key), setItem: () => {} } as unknown as Storage;
      this.planner = readPlanner(readOnly);
      this.blocked = LOCK_MESSAGE;
      return { planner: this.planner, error: this.blocked };
    }
    return this.locks.request(PLANNER_LOCK, () => {
      this.planner = readPlanner(this.storage);
      this.snapshot = trackerSnapshot(this.storage);
      this.blocked = hasLateLegacy(this.storage, this.planner) ? LEGACY_MESSAGE : '';
      return { planner: this.planner, error: this.blocked };
    });
  }

  checkForConflict(): string {
    if (!this.blocked && this.planner && this.snapshot !== trackerSnapshot(this.storage)) this.blocked = CONFLICT_MESSAGE;
    return this.blocked;
  }

  async commit(change: (planner: PlannerData) => PlannerData): Promise<PlannerData> {
    if (!this.locks) throw new Error(LOCK_MESSAGE);
    return this.locks.request(PLANNER_LOCK, () => {
      const conflict = this.checkForConflict();
      if (conflict) throw new Error(conflict);
      if (!this.planner) throw new Error('Данные ещё не загружены.');
      const next = change(this.planner);
      // Writes and snapshot updates are synchronous, with no await in between.
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      this.snapshot = trackerSnapshot(this.storage);
      this.planner = next;
      return next;
    });
  }
}