import { describe, expect, it } from 'vitest';
import { plannerFromRows, type TrackerRows } from '../planner-database';
import { monthData } from '../planner-persistence';
import { habitProgress } from '../habit-progress';

const rows = (): TrackerRows => ({ revision: 2, habits: [{ user_id:'a', id:'run' }], revisions: [
  { user_id:'a', habit_id:'run', effective_from:'2026-10-01', title:'Бег', emoji:'🏃', frequency:{type:'weekly',times:3,days:[1,3,5]}, start_date:'2026-10-01', end_date:null, ended:false },
  { user_id:'a', habit_id:'run', effective_from:'2026-11-01', title:'Бег', emoji:'🏃', frequency:{type:'monthly',times:8}, start_date:'2026-10-01', end_date:'2026-12-15', ended:false },
], goals:[{user_id:'a',id:'goal',month:'2026-10-01',title:'Цель',done:true,position:0}], completions:[
  {user_id:'a',habit_id:'run',completed_on:'2026-10-06'},
  {user_id:'a',habit_id:'run',completed_on:'2026-10-08'},
  {user_id:'a',habit_id:'run',completed_on:'2026-10-10'},
] });

describe('Cloud mapping preserves tracker rules', () => {
  it('new accounts have empty data and no migration backups', () => {
    const p=plannerFromRows({revision:0,habits:[],revisions:[],goals:[],completions:[]});
    expect(monthData(p,2026,9)).toEqual({habits:[],goals:[],checks:{}});
    expect(p.legacyBackup).toEqual({});
  });
  it('habits continue across months and inclusive end dates', () => {
    const p=plannerFromRows(rows());
    expect(monthData(p,2026,10).habits[0]?.id).toBe('run');
    expect(monthData(p,2026,11).habits[0]?.endDate).toBe('2026-12-15');
    expect(monthData(p,2027,0).habits).toEqual([]);
  });
  it('monthly goals and dated completions stay in October', () => {
    const p=plannerFromRows(rows());
    expect(monthData(p,2026,9).goals[0]?.done).toBe(true);
    expect(monthData(p,2026,9).checks['run']).toEqual([6,8,10]);
    expect(monthData(p,2026,10).goals).toEqual([]);
    expect(monthData(p,2026,10).checks).toEqual({});
  });
  it('November edits preserve October frequency and preferred weekdays', () => {
    const p=plannerFromRows(rows());
    expect(monthData(p,2026,9).habits[0]?.freq).toEqual({type:'weekly',times:3,days:[1,3,5]});
    expect(monthData(p,2026,10).habits[0]?.freq).toEqual({type:'monthly',times:8});
  });
  it('off-schedule weekly completions count', () => {
    const p=plannerFromRows(rows()); const h=monthData(p,2026,9).habits[0];
    if (!h) throw new Error('Missing habit');
    expect(habitProgress(h,[6,8,10],2026,9,31,11).done).toBe(3);
  });
});