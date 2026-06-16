ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS current_cell_id uuid REFERENCES public.cells(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS intended_next_cell_id uuid REFERENCES public.cells(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_issues_current_cell_id ON public.issues (current_cell_id);
CREATE INDEX IF NOT EXISTS idx_issues_intended_next_cell_id ON public.issues (intended_next_cell_id);

COMMENT ON COLUMN public.issues.current_cell_id IS 'Cell where the part was located when the issue was reported.';
COMMENT ON COLUMN public.issues.intended_next_cell_id IS 'Next intended cell for the part when known at issue report time.';
