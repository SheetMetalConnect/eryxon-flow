ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS current_cell_id uuid,
ADD COLUMN IF NOT EXISTS intended_next_cell_id uuid;

CREATE INDEX IF NOT EXISTS idx_issues_current_cell_id ON public.issues (current_cell_id);
CREATE INDEX IF NOT EXISTS idx_issues_intended_next_cell_id ON public.issues (intended_next_cell_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'issues_current_cell_tenant_fkey'
  ) THEN
    ALTER TABLE public.issues
    ADD CONSTRAINT issues_current_cell_tenant_fkey
    FOREIGN KEY (tenant_id, current_cell_id)
    REFERENCES public.cells(tenant_id, id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'issues_intended_next_cell_tenant_fkey'
  ) THEN
    ALTER TABLE public.issues
    ADD CONSTRAINT issues_intended_next_cell_tenant_fkey
    FOREIGN KEY (tenant_id, intended_next_cell_id)
    REFERENCES public.cells(tenant_id, id)
    ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.issues.current_cell_id IS 'Cell where the part was located when the issue was reported.';
COMMENT ON COLUMN public.issues.intended_next_cell_id IS 'Next intended cell for the part when known at issue report time.';
