-- Fix /admin/issues 400: the frontend embeds cells via the FK hints
-- `issues_current_cell_id_fkey` / `issues_intended_next_cell_id_fkey`, but the
-- v0.7 location-context migration only created composite tenant-scoped FKs
-- (issues_current_cell_tenant_fkey, ...). PostgREST could not resolve the hinted
-- relationship → 400 on every issue-queue load.
--
-- Add the simple single-column FKs the frontend hints expect. The composite
-- tenant-safe FKs stay (they enforce the v0.7 "deleting a cell nulls only the
-- cell ref, not tenant_id" behaviour); these add the embeddable relationship.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issues_current_cell_id_fkey') THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT issues_current_cell_id_fkey
      FOREIGN KEY (current_cell_id) REFERENCES public.cells(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issues_intended_next_cell_id_fkey') THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT issues_intended_next_cell_id_fkey
      FOREIGN KEY (intended_next_cell_id) REFERENCES public.cells(id) ON DELETE SET NULL;
  END IF;
END $$;
