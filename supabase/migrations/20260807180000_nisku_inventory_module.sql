-- Nisku inventory module (Phase 2 schema)
-- Postgres tables for bar grating / tread stock, adjustments, allocations,
-- and curated section-property seeds. Tenant-scoped for Eryxon multi-tenant RLS.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.inventory_item_kind AS ENUM ('bar_grating', 'tread', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_surface AS ENUM ('serrated', 'smooth', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_finish AS ENUM (
    'bare', 'unpainted', 'galvanized', 'painted_black', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_material AS ENUM (
    'carbon_steel', 'aluminum', 'stainless', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_adjustment_reason AS ENUM (
    'cycle_count', 'import_true_up', 'damage', 'scrap', 'correction', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_allocation_status AS ENUM (
    'reserved', 'issued', 'released', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- grating_section_props — curated S/I per foot (reference catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grating_section_props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation text NOT NULL,
  bar_depth_in numeric(8,4) NOT NULL,
  bar_thickness_in numeric(8,4) NOT NULL,
  surface public.inventory_surface NOT NULL DEFAULT 'smooth',
  material public.inventory_material NOT NULL DEFAULT 'carbon_steel',
  bearing_bar_spacing_in numeric(8,4),
  bars_per_foot numeric(10,4) NOT NULL,
  i_in4_per_ft numeric(14,6) NOT NULL,
  s_in3_per_ft numeric(14,6) NOT NULL,
  weight_psf numeric(10,4),
  effective_depth_in numeric(8,4) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grating_section_props_unique
    UNIQUE (designation, bar_depth_in, bar_thickness_in, surface, material)
);

CREATE INDEX IF NOT EXISTS grating_section_props_desig_depth_idx
  ON public.grating_section_props (designation, bar_depth_in, bar_thickness_in);

COMMENT ON TABLE public.grating_section_props IS
  'Curated NAAMM-style section properties per foot of width for load calculator lookups.';

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  source_item_no text,
  category text,
  kind public.inventory_item_kind NOT NULL DEFAULT 'bar_grating',
  raw_description text NOT NULL DEFAULT '',
  bar_depth_in numeric(8,4),
  bar_thickness_in numeric(8,4),
  designation text,
  bearing_bar_spacing_in numeric(8,4),
  surface public.inventory_surface NOT NULL DEFAULT 'unknown',
  finish public.inventory_finish NOT NULL DEFAULT 'unknown',
  material public.inventory_material NOT NULL DEFAULT 'unknown',
  panel_width_in numeric(10,4),
  panel_length_in numeric(10,4),
  area_sqft numeric(12,4),
  qty_on_hand numeric(14,3) NOT NULL DEFAULT 0,
  qty_reserved numeric(14,3) NOT NULL DEFAULT 0,
  parse_confidence text,
  parse_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  import_batch_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_tenant_sku_unique UNIQUE (tenant_id, sku),
  CONSTRAINT inventory_items_qty_reserved_nonneg CHECK (qty_reserved >= 0)
);

CREATE INDEX IF NOT EXISTS inventory_items_tenant_category_idx
  ON public.inventory_items (tenant_id, category);
CREATE INDEX IF NOT EXISTS inventory_items_tenant_desig_idx
  ON public.inventory_items (tenant_id, designation);
CREATE INDEX IF NOT EXISTS inventory_items_tenant_negative_qty_idx
  ON public.inventory_items (tenant_id)
  WHERE qty_on_hand < 0;

COMMENT ON TABLE public.inventory_items IS
  'Parsed grating/tread stock. qty_on_hand is panels/pieces; area_sqft is derived.';

-- ---------------------------------------------------------------------------
-- inventory_adjustments — cycle counts / true-ups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  reason public.inventory_adjustment_reason NOT NULL DEFAULT 'cycle_count',
  qty_before numeric(14,3) NOT NULL,
  qty_after numeric(14,3) NOT NULL,
  qty_delta numeric(14,3) GENERATED ALWAYS AS (qty_after - qty_before) STORED,
  note text,
  adjusted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_adjustments_item_created_idx
  ON public.inventory_adjustments (inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_adjustments_tenant_created_idx
  ON public.inventory_adjustments (tenant_id, created_at DESC);

COMMENT ON TABLE public.inventory_adjustments IS
  'Audit log for cycle counts and qty true-ups (including clearing negative stock).';

-- ---------------------------------------------------------------------------
-- inventory_allocations — load-calculator reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  status public.inventory_allocation_status NOT NULL DEFAULT 'reserved',
  qty_panels numeric(14,3) NOT NULL CHECK (qty_panels > 0),
  area_sqft numeric(12,4),
  job_id uuid,
  load_calc_snapshot jsonb,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_allocations_item_status_idx
  ON public.inventory_allocations (inventory_item_id, status);
CREATE INDEX IF NOT EXISTS inventory_allocations_tenant_status_idx
  ON public.inventory_allocations (tenant_id, status);

COMMENT ON TABLE public.inventory_allocations IS
  'Material reserved/issued by the NAAMM load calculator against inventory panels.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.grating_section_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_allocations ENABLE ROW LEVEL SECURITY;

-- Reference catalog is readable by authenticated users; writable by service_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grating_section_props' AND policyname = 'grating_section_props_select'
  ) THEN
    CREATE POLICY grating_section_props_select ON public.grating_section_props
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grating_section_props' AND policyname = 'grating_section_props_service'
  ) THEN
    CREATE POLICY grating_section_props_service ON public.grating_section_props
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tenant_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'inventory_items' AND policyname = 'inventory_items_tenant_all'
    ) THEN
      CREATE POLICY inventory_items_tenant_all ON public.inventory_items
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'inventory_adjustments' AND policyname = 'inventory_adjustments_tenant_all'
    ) THEN
      CREATE POLICY inventory_adjustments_tenant_all ON public.inventory_adjustments
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'inventory_allocations' AND policyname = 'inventory_allocations_tenant_all'
    ) THEN
      CREATE POLICY inventory_allocations_tenant_all ON public.inventory_allocations
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id());
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_items' AND policyname = 'inventory_items_service'
  ) THEN
    CREATE POLICY inventory_items_service ON public.inventory_items
      TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_adjustments' AND policyname = 'inventory_adjustments_service'
  ) THEN
    CREATE POLICY inventory_adjustments_service ON public.inventory_adjustments
      TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_allocations' AND policyname = 'inventory_allocations_service'
  ) THEN
    CREATE POLICY inventory_allocations_service ON public.inventory_allocations
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON public.grating_section_props TO authenticated, anon, service_role;
GRANT ALL ON public.grating_section_props TO service_role;
GRANT ALL ON public.inventory_items TO authenticated, service_role;
GRANT ALL ON public.inventory_adjustments TO authenticated, service_role;
GRANT ALL ON public.inventory_allocations TO authenticated, service_role;
