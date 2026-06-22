/**
 * Capacity load — the planned side of the MES, in hours per cell/day.
 *
 * QRM rule: a Yellow Card (operation.status === 'on_hold') releases capacity. A
 * parked operation must contribute 0 to a cell's scheduled load and disappear
 * from the actionable grid, even though its allocation row still exists. The
 * client previously summed every allocation, so parked work leaked back into the
 * load — this pure helper is the single place that enforces the exclusion, for
 * both the allocation path and the planned-operations fallback path.
 */

export interface CapacityAllocation {
  hours_allocated: number | null;
  operation?: { status?: string | null } | null;
}

export interface CapacityFallbackOperation {
  estimated_time: number | null;
  status?: string | null;
}

/** True when an operation is parked under a Yellow Card and must not count. */
export function isParked(status: string | null | undefined): boolean {
  return status === 'on_hold';
}

/** Allocations that still count toward load (Yellow Card parked ones removed). */
export function countingAllocations<T extends CapacityAllocation>(allocations: T[]): T[] {
  return allocations.filter((a) => !isParked(a.operation?.status));
}

/** Operations that still count toward load (Yellow Card parked ones removed). */
export function countingOperations<T extends CapacityFallbackOperation>(ops: T[]): T[] {
  return ops.filter((o) => !isParked(o.status));
}

/**
 * Scheduled hours for one cell/day. Prefers explicit day allocations; when none
 * count, falls back to planned operations (estimated_time in minutes → hours).
 * Yellow Card (on_hold) work contributes 0 on both paths.
 */
export function cellLoadHours(
  allocations: CapacityAllocation[],
  fallbackOps: CapacityFallbackOperation[],
): number {
  const counting = countingAllocations(allocations);
  if (counting.length > 0) {
    return counting.reduce((sum, a) => sum + (a.hours_allocated || 0), 0);
  }
  const minutes = countingOperations(fallbackOps).reduce(
    (sum, o) => sum + (o.estimated_time || 0),
    0,
  );
  return minutes / 60;
}
