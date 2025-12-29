-- Fix the create_operator_with_pin function to properly reference pgcrypto functions
CREATE OR REPLACE FUNCTION public.create_operator_with_pin(
  p_full_name TEXT,
  p_pin TEXT,
  p_employee_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  profile_id UUID,
  employee_id TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id UUID;
  v_new_profile_id UUID;
  v_employee_id TEXT;
  v_operator_number INTEGER;
  v_abbreviation TEXT;
  v_username TEXT;
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
  
  -- Generate or use provided employee ID
  IF p_employee_id IS NOT NULL AND p_employee_id != '' THEN
    -- Check if employee ID is unique within tenant
    IF EXISTS (
      SELECT 1 FROM profiles 
      WHERE tenant_id = v_tenant_id 
      AND employee_id = p_employee_id
    ) THEN
      RAISE EXCEPTION 'Employee ID % already exists in this organization', p_employee_id;
    END IF;
    v_employee_id := p_employee_id;
  ELSE
    -- Auto-generate employee ID using tenant abbreviation
    SELECT abbreviation, next_operator_number
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
    SET next_operator_number = next_operator_number + 1
    WHERE id = v_tenant_id;
  END IF;
  
  -- Create a simple username from full_name
  v_username := LOWER(REGEXP_REPLACE(p_full_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure username is unique within tenant
  WHILE EXISTS (SELECT 1 FROM profiles WHERE tenant_id = v_tenant_id AND username = v_username) LOOP
    v_username := v_username || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Create the profile with pgcrypto functions explicitly qualified
  INSERT INTO profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    pin_hash,
    employee_id,
    is_machine,
    active
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_username,
    p_full_name,
    v_employee_id || '@operator.local',
    'operator',
    extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
    v_employee_id,
    false,
    true
  )
  RETURNING id INTO v_new_profile_id;
  
  -- Create user_roles entry
  INSERT INTO user_roles (user_id, role)
  VALUES (v_new_profile_id, 'operator');
  
  RETURN QUERY SELECT v_new_profile_id, v_employee_id, 'Operator created successfully'::TEXT;
END;
$$;