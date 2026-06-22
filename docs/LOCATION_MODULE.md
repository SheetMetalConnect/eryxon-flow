# Location / placement module

Tracks where a finished part is physically put down, so the next person and the
planner know where it is — and where there's still space. Off by default; enable
per tenant in **Organization settings → Location tracking**.

## Idea

When an operator reports an operation done, the question "where did you put it?"
should be answered once, at the machine, instead of reconstructed later. Admins
lay out the physical drop-off slots (a rack, a floor zone) with a capacity each;
operators pick the slot on completion; occupancy shows what's full.

## Data model

- **`storage_locations`** — the configurable grid. `code` (e.g. `A01`), optional
  `cell_id`, `capacity` (how many parts fit; later expandable by size), `row_index`
  /`col_index` for layout, `active`, `sort_order`. Unique `(tenant_id, code)`.
- **`part_placements`** — placement events. `removed_at IS NULL` = the part is
  currently there. A unique partial index enforces one active placement per part.
  `placed_by` (profile) / `placed_by_operator_id` (terminal operator).
- **`tenants.location_tracking_enabled`** — the per-tenant toggle.

Occupancy (used vs free) is computed in the app from `storage_locations` + active
`part_placements` (`src/lib/locations/placement.ts`, unit-tested), not a DB view.

## Flow

1. Admin enables the toggle and configures slots at `/admin/config/locations`.
2. Operator completes an operation. If tracking is on, a grid picker opens
   ("Waar heb je het neergelegd?"), pre-selecting a suggested open slot (most free,
   scoped to the cell). With tracking off, completion is unchanged.
3. Confirming records a `part_placements` row; the previous active placement for
   that part is closed first.

## Code

- Hooks: `src/hooks/locations/` (`useStorageLocations`, `useLocationTracking`,
  `useStorageLocationMutations`, `useRecordPlacement`).
- UI: `src/pages/admin/config/Locations.tsx`, `src/components/locations/PlacementPickerModal.tsx`.
- Operator wiring: `src/pages/operator/OperatorView.tsx` (`handleCompleteWithPlacement`).
- Core logic: `src/lib/locations/placement.ts` (+ `.test.ts`).
- Schema: `supabase/migrations/20260622130000_location_placement_module.sql`.

## Roadmap

Capacity by part size; API/MCP endpoints for automated placement; map/visual layout.
