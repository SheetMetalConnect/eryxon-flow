-- Ensure a persistent managed-pilot milestone can be observed by support.
-- A tenant is considered pilot-ready once the first qualifying assignment is created.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS pilot_ready_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.tenants.pilot_ready_at
  IS 'Timestamp when tenant first reached pilot-ready (first operator assignment created).';

WITH first_assignments AS (
  SELECT
    a.tenant_id,
    MIN(a.created_at) AS first_assigned_at
  FROM public.assignments a
  WHERE a.status = 'assigned'
    AND (a.operator_id IS NOT NULL OR a.shop_floor_operator_id IS NOT NULL)
  GROUP BY a.tenant_id
)
UPDATE public.tenants t
SET pilot_ready_at = fa.first_assigned_at
FROM first_assignments fa
WHERE t.id = fa.tenant_id
  AND t.pilot_ready_at IS NULL;

CREATE OR REPLACE FUNCTION public.record_pilot_ready_from_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'assigned' THEN
    UPDATE public.tenants
    SET pilot_ready_at = COALESCE(pilot_ready_at, NOW())
    WHERE id = NEW.tenant_id
      AND pilot_ready_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_record_pilot_ready_at ON public.assignments;
CREATE TRIGGER trigger_record_pilot_ready_at
AFTER INSERT OR UPDATE OF status ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.record_pilot_ready_from_assignment();

ALTER FUNCTION public.record_pilot_ready_from_assignment() OWNER TO postgres;
