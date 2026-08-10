-- Work order / delivery dispatch for inventory
-- Jobs remain Eryxon work orders; dispatches are pick/pack tickets against allocations.

-- Optional FK: allocations → jobs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jobs'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_allocations_job_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_allocations
      ADD CONSTRAINT inventory_allocations_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS inventory_allocations_job_id_idx
  ON public.inventory_allocations (job_id)
  WHERE job_id IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE public.inventory_dispatch_status AS ENUM (
    'draft', 'picking', 'ready', 'shipped', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dispatch_number text NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  status public.inventory_dispatch_status NOT NULL DEFAULT 'draft',
  customer_name text,
  delivery_address text,
  delivery_city text,
  delivery_notes text,
  shipped_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_dispatches_tenant_number_unique UNIQUE (tenant_id, dispatch_number)
);

CREATE INDEX IF NOT EXISTS inventory_dispatches_tenant_status_idx
  ON public.inventory_dispatches (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.inventory_dispatch_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dispatch_id uuid NOT NULL REFERENCES public.inventory_dispatches(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.inventory_allocations(id) ON DELETE RESTRICT,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  qty_panels numeric(14,3) NOT NULL CHECK (qty_panels > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_dispatch_lines_alloc_unique UNIQUE (allocation_id)
);

CREATE INDEX IF NOT EXISTS inventory_dispatch_lines_dispatch_idx
  ON public.inventory_dispatch_lines (dispatch_id);

ALTER TABLE public.inventory_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_dispatch_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tenant_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'inventory_dispatches' AND policyname = 'inventory_dispatches_tenant_all'
    ) THEN
      CREATE POLICY inventory_dispatches_tenant_all ON public.inventory_dispatches
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'inventory_dispatch_lines' AND policyname = 'inventory_dispatch_lines_tenant_all'
    ) THEN
      CREATE POLICY inventory_dispatch_lines_tenant_all ON public.inventory_dispatch_lines
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id());
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_dispatches' AND policyname = 'inventory_dispatches_service'
  ) THEN
    CREATE POLICY inventory_dispatches_service ON public.inventory_dispatches
      TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory_dispatch_lines' AND policyname = 'inventory_dispatch_lines_service'
  ) THEN
    CREATE POLICY inventory_dispatch_lines_service ON public.inventory_dispatch_lines
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.inventory_dispatches TO authenticated, service_role;
GRANT ALL ON public.inventory_dispatch_lines TO authenticated, service_role;

-- Issue reserved stock when a dispatch ships: drop on-hand + reserved, mark allocation issued
CREATE OR REPLACE FUNCTION public.ship_inventory_dispatch(p_dispatch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_status text;
  r record;
BEGIN
  SELECT tenant_id, status::text INTO v_tenant, v_status
  FROM inventory_dispatches WHERE id = p_dispatch_id FOR UPDATE;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Dispatch not found';
  END IF;
  IF v_status = 'shipped' THEN
    RAISE EXCEPTION 'Dispatch already shipped';
  END IF;
  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'Dispatch is cancelled';
  END IF;

  FOR r IN
    SELECT l.allocation_id, l.inventory_item_id, l.qty_panels
    FROM inventory_dispatch_lines l
    WHERE l.dispatch_id = p_dispatch_id
  LOOP
    UPDATE inventory_allocations
    SET status = 'issued', updated_at = now()
    WHERE id = r.allocation_id AND status = 'reserved';

    UPDATE inventory_items
    SET
      qty_on_hand = qty_on_hand - r.qty_panels,
      qty_reserved = GREATEST(qty_reserved - r.qty_panels, 0),
      updated_at = now()
    WHERE id = r.inventory_item_id;
  END LOOP;

  UPDATE inventory_dispatches
  SET status = 'shipped', shipped_at = now(), updated_at = now()
  WHERE id = p_dispatch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ship_inventory_dispatch(uuid) TO authenticated, service_role;
