import type { RoutingStep } from '@/types/qrm';

export interface RoutingOperation {
  status: string;
  cell_id: string | null;
  cell: { id: string; name: string; color: string | null; sequence: number } | null;
}

export function groupRoutingSteps(operations: RoutingOperation[]): RoutingStep[] {
  const groups = new Map<string, RoutingStep>();
  for (const { status, cell } of operations) {
    if (!cell) continue;
    let step = groups.get(cell.id);
    if (!step) {
      step = { cell_id: cell.id, cell_name: cell.name, cell_color: cell.color,
        sequence: cell.sequence, operation_count: 0, completed_operations: 0 };
      groups.set(cell.id, step);
    }
    step.operation_count++;
    if (status === 'completed') step.completed_operations++;
  }
  return [...groups.values()].sort((a, b) => a.sequence - b.sequence);
}
