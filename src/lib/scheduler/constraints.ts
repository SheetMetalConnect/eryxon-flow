import { addDays } from 'date-fns';
import type { Operation, OperationScheduleConstraint } from './types';

/** Build per-operation constraints from active steps earlier in the same route. */
export function buildOperationScheduleConstraints(
  operations: Operation[],
  reference = new Date(),
): Map<string, OperationScheduleConstraint> {
  const activeByPart = new Map<string, Operation[]>();
  const targets: Operation[] = [];

  for (const operation of operations) {
    if (operation.status === 'not_started') {
      targets.push(operation);
    } else if (operation.status !== 'completed') {
      const active = activeByPart.get(operation.part_id) ?? [];
      active.push(operation);
      activeByPart.set(operation.part_id, active);
    }
  }

  const constraints = new Map<string, OperationScheduleConstraint>();
  for (const target of targets) {
    const predecessors = (activeByPart.get(target.part_id) ?? []).filter(
      (operation) => operation.sequence < target.sequence,
    );
    if (predecessors.length === 0) continue;
    if (predecessors.some((operation) => !operation.planned_end)) {
      constraints.set(target.id, { blockedByPredecessor: true });
      continue;
    }

    let latestEnd: Date | null = null;
    for (const predecessor of predecessors) {
      const end = new Date(predecessor.planned_end as string);
      if (Number.isFinite(end.getTime()) && (!latestEnd || end > latestEnd)) latestEnd = end;
    }
    if (latestEnd) {
      constraints.set(target.id, {
        earliestStart: addDays(latestEnd > reference ? latestEnd : reference, 1),
      });
    }
  }

  return constraints;
}
