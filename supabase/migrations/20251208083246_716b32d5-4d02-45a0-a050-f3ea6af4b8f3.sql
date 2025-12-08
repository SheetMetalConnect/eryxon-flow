-- Create separate operators table (no auth.users reference)
CREATE TABLE IF NOT EXISTS public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(tenant_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view operators in their tenant"
ON public.operators FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage operators"
ON public.operators FOR ALL
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Index for quick lookup by employee_id
CREATE INDEX idx_operators_employee_id ON public.operators(tenant_id, employee_id);

-- Drop all old versions of create_operator_with_pin
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text);
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text, public.app_role);
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text, uuid);
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text);

-- New clean function that inserts into operators table
CREATE OR REPLACE FUNCTION public.create_operator_with_pin(
  p_full_name TEXT,
  p_pin TEXT,
  p_employee_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  operator_id UUID,
  employee_id TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_new_operator_id UUID;
  v_employee_id TEXT;
  v_operator_number INTEGER;
  v_abbreviation TEXT;
  v_pin_hash TEXT;
BEGIN
  -- Get current user's tenant_id
  v_tenant_id := get_user_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;
  
  -- Validate PIN (must be 4-6 digits)
  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;
  
  -- Generate PIN hash using pgcrypto
  v_pin_hash := extensions.crypt(p_pin, extensions.gen_salt('bf', 8));
  
  -- Generate or use provided employee ID
  IF p_employee_id IS NOT NULL AND p_employee_id != '' THEN
    -- Check if employee ID is unique within tenant
    IF EXISTS (
      SELECT 1 FROM operators op
      WHERE op.tenant_id = v_tenant_id 
      AND op.employee_id = p_employee_id
    ) THEN
      RAISE EXCEPTION 'Employee ID % already exists in this organization', p_employee_id;
    END IF;
    v_employee_id := p_employee_id;
  ELSE
    -- Auto-generate employee ID using tenant abbreviation
    SELECT abbreviation, COALESCE(next_operator_number, 1)
    INTO v_abbreviation, v_operator_number
    FROM tenants WHERE id = v_tenant_id;
    
    -- Ensure abbreviation exists
    IF v_abbreviation IS NULL THEN
      SELECT generate_tenant_abbreviation(COALESCE(company_name, name))
      INTO v_abbreviation
      FROM tenants WHERE id = v_tenant_id;
      
      UPDATE tenants SET abbreviation = v_abbreviation WHERE id = v_tenant_id;
    END IF;
    
    -- Format: VMC0001, VMC0002, etc.
    v_employee_id := v_abbreviation || LPAD(v_operator_number::TEXT, 4, '0');
    
    -- Increment the counter
    UPDATE tenants 
    SET next_operator_number = COALESCE(next_operator_number, 1) + 1
    WHERE id = v_tenant_id;
  END IF;
  
  -- Create the operator
  INSERT INTO operators (
    tenant_id, employee_id, full_name, pin_hash, created_by, active
  ) VALUES (
    v_tenant_id, v_employee_id, p_full_name, v_pin_hash, auth.uid(), true
  )
  RETURNING id INTO v_new_operator_id;
  
  RETURN QUERY SELECT v_new_operator_id, v_employee_id, 'Operator created successfully'::TEXT;
END;
$$;

-- Function to verify operator PIN (for terminal authentication)
CREATE OR REPLACE FUNCTION public.verify_operator_pin(
  p_employee_id TEXT,
  p_pin TEXT
)
RETURNS TABLE(
  operator_id UUID,
  full_name TEXT,
  employee_id TEXT,
  verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_operator RECORD;
BEGIN
  v_tenant_id := get_user_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;
  
  SELECT o.id, o.full_name, o.employee_id, o.pin_hash
  INTO v_operator
  FROM operators o
  WHERE o.tenant_id = v_tenant_id
    AND o.employee_id = p_employee_id
    AND o.active = true;
  
  IF v_operator IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, false;
    RETURN;
  END IF;
  
  -- Verify PIN
  IF v_operator.pin_hash = extensions.crypt(p_pin, v_operator.pin_hash) THEN
    RETURN QUERY SELECT v_operator.id, v_operator.full_name, v_operator.employee_id, true;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, false;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_operator_with_pin(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(TEXT, TEXT) TO authenticated;