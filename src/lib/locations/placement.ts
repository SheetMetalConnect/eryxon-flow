/**
 * Location/placement module — pure logic for the drop-off grid.
 *
 * When an operator reports work done, they pick where they physically placed the
 * part. A slot has a configurable capacity (how many parts fit). These helpers
 * compute per-slot occupancy and suggest an open slot ("keeping in mind where
 * there's space"). UI and data fetching live elsewhere; this stays pure + testable.
 */

export interface StorageLocation {
  id: string;
  code: string;
  label?: string | null;
  cell_id?: string | null;
  capacity: number;
  sort_order?: number | null;
  active?: boolean | null;
}

/** An active placement (removed_at IS NULL) — only its location matters for occupancy. */
export interface ActivePlacement {
  location_id: string;
}

export interface LocationOccupancy {
  location: StorageLocation;
  occupied: number;
  available: number;
  isFull: boolean;
}

/** Per-slot occupancy across active placements. Inactive locations are excluded. */
export function summarizeOccupancy(
  locations: StorageLocation[],
  placements: ActivePlacement[]
): LocationOccupancy[] {
  const counts = new Map<string, number>();
  for (const p of placements) {
    counts.set(p.location_id, (counts.get(p.location_id) ?? 0) + 1);
  }
  return locations
    .filter((l) => l.active !== false)
    .map((l) => {
      const occupied = counts.get(l.id) ?? 0;
      const available = Math.max(l.capacity - occupied, 0);
      return { location: l, occupied, available, isFull: available <= 0 };
    });
}

/**
 * Suggest where to drop the part. When a cell is given, prefer that cell's own
 * slots, then fall back to unassigned (general, cell_id null) slots — a slot
 * with no cell belongs to no lane in particular, so it's a valid catch-all.
 * Within that, pick the most free space, then configured order, then code.
 * Null if everything in scope is full.
 */
export function suggestLocation(
  occupancy: LocationOccupancy[],
  opts?: { cellId?: string | null }
): LocationOccupancy | null {
  const cellId = opts?.cellId ?? null;
  const candidates = occupancy.filter(
    (o) =>
      !o.isFull &&
      (cellId == null ||
        o.location.cell_id === cellId ||
        o.location.cell_id == null)
  );
  if (candidates.length === 0) return null;
  // The cell's own slots rank ahead of general slots.
  const cellRank = (o: LocationOccupancy) =>
    cellId != null && o.location.cell_id === cellId ? 0 : 1;
  candidates.sort(
    (a, b) =>
      cellRank(a) - cellRank(b) ||
      b.available - a.available ||
      (a.location.sort_order ?? 0) - (b.location.sort_order ?? 0) ||
      a.location.code.localeCompare(b.location.code)
  );
  return candidates[0];
}

export function canPlace(o: LocationOccupancy): boolean {
  return !o.isFull;
}
