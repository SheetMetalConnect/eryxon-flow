-- Enable pgcrypto extension for gen_salt function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add abbreviation and operator counter to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS abbreviation TEXT,
ADD COLUMN IF NOT EXISTS next_operator_number INTEGER DEFAULT 1;

-- Create a function to generate tenant abbreviation from company name
CREATE OR REPLACE FUNCTION public.generate_tenant_abbreviation(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_words TEXT[];
  v_abbr TEXT := '';
  v_word TEXT;
BEGIN
  -- Split by spaces and get first letter of each word (max 4 words)
  v_words := regexp_split_to_array(UPPER(TRIM(p_name)), '\s+');
  
  FOREACH v_word IN ARRAY v_words[1:4]
  LOOP
    IF LENGTH(v_word) > 0 THEN
      v_abbr := v_abbr || SUBSTRING(v_word FROM 1 FOR 1);
    END IF;
  END LOOP;
  
  -- Ensure at least 2 characters
  IF LENGTH(v_abbr) < 2 THEN
    v_abbr := UPPER(SUBSTRING(p_name FROM 1 FOR 3));
  END IF;
  
  RETURN v_abbr;
END;
$$;

-- Set abbreviations for existing tenants that don't have one
UPDATE public.tenants
SET abbreviation = generate_tenant_abbreviation(COALESCE(company_name, name))
WHERE abbreviation IS NULL;

-- Set specific abbreviations for known tenants
UPDATE public.tenants SET abbreviation = 'SMC' WHERE name ILIKE '%sheet metal connect%' AND abbreviation IS NULL;
UPDATE public.tenants SET abbreviation = 'VMC' WHERE name ILIKE '%veluw metal%' AND abbreviation IS NULL;

-- Create or replace the operator creation function
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
SET search_path = public
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
  
  -- Create the profile
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
    v_employee_id || '@operator.local',  -- Placeholder email for operators
    'operator',
    crypt(p_pin, gen_salt('bf', 8)),
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

-- Update existing tenants with operator counts based on existing operators
WITH operator_counts AS (
  SELECT 
    tenant_id,
    COUNT(*) + 1 as next_num
  FROM profiles 
  WHERE role = 'operator' 
  GROUP BY tenant_id
)
UPDATE tenants t
SET next_operator_number = COALESCE(oc.next_num, 1)
FROM operator_counts oc
WHERE t.id = oc.tenant_id;