import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { plannerFromRows, validatePlannerForDatabase, type TrackerRows } from './planner-database';
import type { PlannerData } from './planner-persistence';
import { CONFLICT_MESSAGE } from './planner-session';

export class PlannerCloudSession {
  private planner: PlannerData | undefined;
  private revision = 0;
  private blocked = '';
  private queue: Promise<unknown> = Promise.resolve();

  async initialize() {
    const { data, error } = await supabase.rpc('read_tracker');
    if (error) throw error;
    const rows = data as unknown as TrackerRows;
    this.revision = rows.revision;
    this.planner = plannerFromRows(rows);
    return { planner: this.planner, error: '' };
  }

  checkForConflict() { return this.blocked; }

  commit(change: (planner: PlannerData) => PlannerData): Promise<PlannerData> {
    const action = this.queue.then(async () => {
      if (this.blocked) throw new Error(this.blocked);
      if (!this.planner) throw new Error('Данные ещё не загружены.');
      const next = change(this.planner);
      validatePlannerForDatabase(next);
      const { data, error } = await supabase.rpc('save_tracker', {
        expected_revision: this.revision,
        payload: JSON.parse(JSON.stringify(next)) as Json,
      });
      if (error) {
        // A failed network response could hide a committed transaction. Block
        // until reload instead of retrying against ambiguous stale state.
        this.blocked = error.message.includes('TRACKER_CONFLICT') ? CONFLICT_MESSAGE
          : 'Не удалось подтвердить сохранение. Проверьте соединение и обновите страницу перед дальнейшими изменениями.';
        throw new Error(this.blocked);
      }
      this.revision = data;
      this.planner = next;
      return next;
    });
    this.queue = action.catch(() => undefined);
    return action;
  }
}