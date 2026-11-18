import { expect, it } from 'vitest';
import { groupRoutingSteps } from './routingSummary';

it('counts completed operations and orders the shared job routing by cell sequence', () => {
  const cut = { id: 'cut', name: 'Cutting', color: '#fff', sequence: 1 };
  const bend = { id: 'bend', name: 'Bending', color: '#000', sequence: 2 };
  const routing = groupRoutingSteps([
    { status: 'not_started', cell_id: bend.id, cell: bend },
    { status: 'completed', cell_id: cut.id, cell: cut },
    { status: 'in_progress', cell_id: cut.id, cell: cut },
    { status: 'completed', cell_id: null, cell: null },
  ]);
  expect(routing.map(({ cell_id, operation_count, completed_operations }) =>
    ({ cell_id, operation_count, completed_operations }))).toEqual([
      { cell_id: 'cut', operation_count: 2, completed_operations: 1 },
      { cell_id: 'bend', operation_count: 1, completed_operations: 0 },
    ]);
});
