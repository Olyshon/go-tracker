import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, auth: { getUser: mocks.getUser } } }));
import { PlannerCloudSession } from '../planner-cloud-session';

beforeEach(() => {
  mocks.rpc.mockReset(); mocks.getUser.mockReset();
  mocks.getUser.mockResolvedValue({data:{user:{id:'account-a'}},error:null});
  mocks.rpc.mockResolvedValueOnce({data:{revision:0,habits:[],revisions:[],completions:[],goals:[]},error:null});
});
it('serializes rapid actions and increments revision without losing the first goal', async () => {
  const session=new PlannerCloudSession(); await session.initialize();
  mocks.rpc.mockResolvedValueOnce({data:1,error:null}).mockResolvedValueOnce({data:2,error:null});
  const add=(id:string)=>session.commit(p=>({...p,months:{...p.months,'2026-10':{checks:{},goals:[...(p.months['2026-10']?.goals??[]),{id,title:id,done:false}]}}}));
  const [first,second]=await Promise.all([add('one'),add('two')]);
  expect(first.months['2026-10']?.goals).toHaveLength(1);
  expect(second.months['2026-10']?.goals.map(g=>g.id)).toEqual(['one','two']);
  expect(mocks.rpc.mock.calls[2]?.[1].expected_revision).toBe(1);
  expect(mocks.rpc.mock.calls[2]?.[1].payload.userId).toBe('account-a');
});
it('rejects a stale write and blocks subsequent edits instead of overwriting', async () => {
  const session=new PlannerCloudSession(); await session.initialize();
  mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'TRACKER_CONFLICT'}});
  await expect(session.commit(p=>p)).rejects.toThrow('Данные изменились');
  await expect(session.commit(p=>p)).rejects.toThrow('Данные изменились');
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it('uncertain network writes block retries until reload', async () => {
  const session=new PlannerCloudSession(); await session.initialize();
  mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'Failed to fetch'}});
  await expect(session.commit(p=>p)).rejects.toThrow('Не удалось подтвердить сохранение');
  await expect(session.commit(p=>p)).rejects.toThrow('Не удалось подтвердить сохранение');
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
});