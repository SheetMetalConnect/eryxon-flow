-- Flag negative / disputed stock for the Reconcile UI
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS needs_reconciliation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS inventory_items_tenant_reconcile_idx
  ON public.inventory_items (tenant_id)
  WHERE needs_reconciliation = true;

COMMENT ON COLUMN public.inventory_items.needs_reconciliation IS
  'True when qty_on_hand is negative or stock was flagged for cycle-count true-up.';
