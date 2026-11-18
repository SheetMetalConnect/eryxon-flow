import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOperationDetails, fetchOperationsWithDetails } from './operations';

const state = vi.hoisted(() => ({
  rows: [] as { id: string; status: string; sequence: number }[],
  queries: [] as { table: string; filters: [string, string, string][]; range?: [number, number] }[],
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const filters: [string, string, string][] = [];
    let range: [number, number] = [0, 999];
    const query = {
      select: () => query,
      eq: (column: string, value: string) => { filters.push(['eq', column, value]); return query; },
      neq: (column: string, value: string) => { filters.push(['neq', column, value]); return query; },
      order: () => query, is: () => query, in: () => query, like: () => query,
      range: (from: number, to: number) => { range = [from, to]; return query; },
      then: (resolve: (result: { data: typeof state.rows; error: null }) => unknown) => {
        state.queries.push({ table, filters: [...filters], range });
        const rows = table === 'operations' ? state.rows.filter(row => filters.every(([kind, column, value]) => {
          if (column !== 'id' && column !== 'status') return true;
          return kind === 'eq' ? row[column] === value : row[column] !== value;
        })).slice(range[0], range[1] + 1) : [];
        return Promise.resolve(resolve({ data: rows, error: null }));
      },
    };
    return query;
  },
} }));

beforeEach(() => { state.queries = []; state.rows = []; });
describe('operation queue reads', () => {
  it('filters completed history before paging and loads every active operation', async () => {
    state.rows = [
      ...Array.from({ length: 1200 }, (_, i) => ({ id: `done-${i}`, status: 'completed', sequence: 0 })),
      ...Array.from({ length: 501 }, (_, i) => ({ id: `active-${i}`, status: 'not_started', sequence: 1 })),
    ];
    const operations = await fetchOperationsWithDetails('tenant-1');
    expect(operations).toHaveLength(501);
    expect(operations[operations.length - 1]?.id).toBe('active-500');
    expect(state.queries.filter(query => query.table === 'operations').map(query => query.range))
      .toEqual([[0, 499], [500, 999]]);
  });

  it('loads a completed detail by ID without scanning the tenant queue', async () => {
    state.rows = [{ id: 'completed-detail', status: 'completed', sequence: 1 }];
    const operation = await fetchOperationDetails('tenant-1', 'completed-detail');
    expect(operation?.id).toBe('completed-detail');
    expect(state.queries[0].filters).toContainEqual(['eq', 'id', 'completed-detail']);
    expect(state.queries[0].filters).not.toContainEqual(['neq', 'status', 'completed']);
  });
});
