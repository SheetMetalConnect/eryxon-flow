-- Add shop_floor_operator_id to assignments table
-- This allows assigning work directly to PIN-based operators from the operators table

-- Add the new column (nullable)
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS shop_floor_operator_id UUID REFERENCES public.operators(id);

-- Make operator_id nullable (previously required)
-- Now either operator_id OR shop_floor_operator_id should be set
ALTER TABLE public.assignments
ALTER COLUMN operator_id DROP NOT NULL;

-- Add check constraint: at least one operator must be assigned
ALTER TABLE public.assignments
ADD CONSTRAINT check_operator_assigned
CHECK (operator_id IS NOT NULL OR shop_floor_operator_id IS NOT NULL);

-- Index for quick lookup by shop floor operator
CREATE INDEX IF NOT EXISTS idx_assignments_shop_floor_operator
ON public.assignments(shop_floor_operator_id);

-- Update RLS policy to allow operators to view their own assignments
-- (when matching shop_floor_operator_id)
DROP POLICY IF EXISTS "Operators can update their own assignments" ON public.assignments;

CREATE POLICY "Operators can update their own assignments"
ON public.assignments FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id()
  AND (
    operator_id = auth.uid()
    -- Shop floor operator assignments are managed by admins
  )
);

-- Grant access for shop floor operator assignment lookups
-- Function to get assignments for a shop floor operator
CREATE OR REPLACE FUNCTION public.get_operator_assignments(
  p_operator_id UUID
)
RETURNS TABLE(
  assignment_id UUID,
  part_id UUID,
  part_number TEXT,
  job_id UUID,
  job_number TEXT,
  customer TEXT,
  assigned_by_name TEXT,
  assigned_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;

  -- Verify the operator belongs to this tenant
  IF NOT EXISTS (
    SELECT 1 FROM operators o
    WHERE o.id = p_operator_id AND o.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Operator not found in this organization';
  END IF;

  RETURN QUERY
  SELECT
    a.id as assignment_id,
    a.part_id,
    p.part_number,
    a.job_id,
    j.job_number,
    j.customer,
    prof.full_name as assigned_by_name,
    a.created_at as assigned_at,
    a.status::TEXT
  FROM assignments a
  LEFT JOIN parts p ON p.id = a.part_id
  LEFT JOIN jobs j ON j.id = a.job_id
  LEFT JOIN profiles prof ON prof.id = a.assigned_by
  WHERE a.shop_floor_operator_id = p_operator_id
    AND a.tenant_id = v_tenant_id
    AND a.status != 'completed'
  ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_operator_assignments(UUID) TO authenticated;
