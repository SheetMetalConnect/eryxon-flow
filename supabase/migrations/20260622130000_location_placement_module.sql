-- Location / placement module (core, toggleable).
--
-- Configurable grid of physical drop-off locations per cell, each with a
-- capacity (how many parts fit; later expandable by size), plus placement
-- tracking captured when an operator reports work done: "where did you put it?".
-- Builds on the v0.7 issue cell-context (current_cell_id / intended_next_cell_id).
-- Off by default; opt-in per tenant via tenants.location_tracking_enabled.

-- 1. Core module toggle (opt-in).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS location_tracking_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.location_tracking_enabled IS
  'Enables the location/placement module: operators pick a drop-off slot when reporting work done.';

-- 2. Configurable grid of physical storage / drop-off locations.
CREATE TABLE IF NOT EXISTS public.storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cell_id uuid REFERENCES public.cells(id) ON DELETE SET NULL,
  code text NOT NULL,
  label text,
  row_index integer,
  col_index integer,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storage_locations_tenant_code_key UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_storage_locations_tenant_cell
  ON public.storage_locations (tenant_id, cell_id) WHERE active;

ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'storage_locations'
      AND policyname = 'storage_locations_tenant_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "storage_locations_tenant_all"
        ON public.storage_locations FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id())
    $pol$;
  END IF;
END $$;

COMMENT ON COLUMN public.storage_locations.capacity IS
  'How many parts the slot holds (config; later expandable by part size).';

-- 3. Part placement events. removed_at IS NULL = currently at that location.
CREATE TABLE IF NOT EXISTS public.part_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  operation_id uuid,
  placed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  placed_by_operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  placed_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Occupancy lookups (active placements per location).
CREATE INDEX IF NOT EXISTS idx_part_placements_active_location
  ON public.part_placements (tenant_id, location_id) WHERE removed_at IS NULL;
-- A part is in at most one place at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_placements_one_active_per_part
  ON public.part_placements (part_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_part_placements_part
  ON public.part_placements (tenant_id, part_id);

ALTER TABLE public.part_placements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'part_placements'
      AND policyname = 'part_placements_tenant_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "part_placements_tenant_all"
        ON public.part_placements FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id())
    $pol$;
  END IF;
END $$;

-- Occupancy (free vs used per slot) is computed in the app from storage_locations
-- + active part_placements (see src/lib/locations/placement.ts), so no DB view.
