-- =====================================================
-- Fix Operator/Worker Creation with PIN
-- =====================================================
-- This migration fixes the create_operator_with_pin function
-- that was failing due to improper gen_salt() usage.
-- Also adds verify_operator_pin for PIN-based login.

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- Add employee_id and pin_hash columns if missing
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS has_email_login BOOLEAN DEFAULT true;

-- Create unique index for employee_id within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_id
ON public.profiles (tenant_id, employee_id)
WHERE employee_id IS NOT NULL;

-- =====================================================
-- Function: create_operator_with_pin (with tenant_id)
-- =====================================================
-- Creates an operator profile with PIN authentication.
-- Returns the new profile ID.
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text, app_role, uuid);

CREATE OR REPLACE FUNCTION public.create_operator_with_pin(
  p_full_name TEXT,
  p_employee_id TEXT,
  p_pin TEXT,
  p_role app_role DEFAULT 'operator',
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_tenant_id UUID;
  v_pin_hash TEXT;
  v_username TEXT;
  v_email TEXT;
BEGIN
  -- Get tenant_id from param or current user's profile
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine tenant_id. Please provide p_tenant_id or ensure you are authenticated.';
    END IF;
  END IF;

  -- Validate inputs
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF p_employee_id IS NULL OR trim(p_employee_id) = '' THEN
    RAISE EXCEPTION 'Employee ID is required';
  END IF;

  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 6 THEN
    RAISE EXCEPTION 'PIN must be 4-6 characters';
  END IF;

  -- Check if employee_id already exists for this tenant
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE tenant_id = v_tenant_id
    AND employee_id = p_employee_id
  ) THEN
    RAISE EXCEPTION 'Employee ID already exists: %', p_employee_id;
  END IF;

  -- Generate hashed PIN using bcrypt
  v_pin_hash := crypt(p_pin, gen_salt('bf'));

  -- Generate unique username and email
  v_username := lower(regexp_replace(p_employee_id, '[^a-zA-Z0-9]', '_', 'g'));
  v_email := v_username || '@operator.local';

  -- Ensure username is unique by appending timestamp if needed
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || extract(epoch from now())::integer;
    v_email := v_username || '@operator.local';
  END IF;

  -- Generate new profile ID
  v_profile_id := gen_random_uuid();

  -- Create the profile
  INSERT INTO profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    employee_id,
    pin_hash,
    has_email_login,
    is_machine,
    active
  ) VALUES (
    v_profile_id,
    v_tenant_id,
    v_username,
    trim(p_full_name),
    v_email,
    p_role,
    p_employee_id,
    v_pin_hash,
    false,  -- No email login for PIN-based operators
    false,  -- Not a machine
    true
  );

  -- Create user_roles entry for RLS
  INSERT INTO user_roles (user_id, role)
  VALUES (v_profile_id, p_role);

  RETURN v_profile_id::text;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_operator_with_pin(text, text, text, app_role, uuid) TO authenticated;

-- =====================================================
-- Function: verify_operator_pin
-- =====================================================
-- Verifies an operator's PIN and returns their profile if valid.
-- Returns NULL if credentials are invalid.
DROP FUNCTION IF EXISTS public.verify_operator_pin(text, text, uuid);

CREATE OR REPLACE FUNCTION public.verify_operator_pin(
  p_employee_id TEXT,
  p_pin TEXT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  profile_id UUID,
  tenant_id UUID,
  username TEXT,
  full_name TEXT,
  email TEXT,
  role app_role,
  is_machine BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from param or current user's profile
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT p.tenant_id INTO v_tenant_id
    FROM profiles p
    WHERE p.id = auth.uid();
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.tenant_id,
    p.username,
    p.full_name,
    p.email,
    p.role,
    p.is_machine
  FROM profiles p
  WHERE p.tenant_id = v_tenant_id
    AND p.employee_id = p_employee_id
    AND p.active = true
    AND p.pin_hash IS NOT NULL
    AND p.pin_hash = crypt(p_pin, p.pin_hash);
END;
$$;

-- Grant execute to authenticated users (and anon for login)
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(text, text, uuid) TO anon;

-- =====================================================
-- Function: create_machine_worker
-- =====================================================
-- Creates a machine worker profile that can report via API.
-- Machines don't have PIN - they authenticate via API keys.
DROP FUNCTION IF EXISTS public.create_machine_worker(text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.create_machine_worker(
  p_name TEXT,
  p_machine_id TEXT,
  p_description TEXT DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  profile_id UUID,
  api_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_tenant_id UUID;
  v_username TEXT;
  v_email TEXT;
  v_api_key TEXT;
  v_api_key_hash TEXT;
BEGIN
  -- Get tenant_id from param or current user's profile
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine tenant_id. Please provide p_tenant_id or ensure you are authenticated.';
    END IF;
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Machine name is required';
  END IF;

  IF p_machine_id IS NULL OR trim(p_machine_id) = '' THEN
    RAISE EXCEPTION 'Machine ID is required';
  END IF;

  -- Check if machine_id already exists for this tenant
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE tenant_id = v_tenant_id
    AND employee_id = p_machine_id
  ) THEN
    RAISE EXCEPTION 'Machine ID already exists: %', p_machine_id;
  END IF;

  -- Generate unique username and email
  v_username := 'machine_' || lower(regexp_replace(p_machine_id, '[^a-zA-Z0-9]', '_', 'g'));
  v_email := v_username || '@machine.local';

  -- Ensure username is unique
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || extract(epoch from now())::integer;
    v_email := v_username || '@machine.local';
  END IF;

  -- Generate new profile ID
  v_profile_id := gen_random_uuid();

  -- Generate API key for machine
  v_api_key := 'mch_' || encode(gen_random_bytes(24), 'hex');
  v_api_key_hash := crypt(v_api_key, gen_salt('bf'));

  -- Create the profile
  INSERT INTO profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    employee_id,
    has_email_login,
    is_machine,
    active
  ) VALUES (
    v_profile_id,
    v_tenant_id,
    v_username,
    trim(p_name),
    v_email,
    'operator',  -- Machines are always operators
    p_machine_id,
    false,
    true,  -- This is a machine
    true
  );

  -- Create user_roles entry for RLS
  INSERT INTO user_roles (user_id, role)
  VALUES (v_profile_id, 'operator');

  -- Store the API key in api_keys table
  INSERT INTO api_keys (
    tenant_id,
    name,
    key_hash,
    key_prefix,
    created_by,
    active
  ) VALUES (
    v_tenant_id,
    'Machine: ' || p_name,
    v_api_key_hash,
    left(v_api_key, 10),
    v_profile_id,
    true
  );

  -- Return the profile_id and API key (only returned once, never stored in plain text)
  RETURN QUERY SELECT v_profile_id, v_api_key;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_machine_worker(text, text, text, uuid) TO authenticated;

-- =====================================================
-- Function: update_operator_pin
-- =====================================================
-- Updates an operator's PIN
DROP FUNCTION IF EXISTS public.update_operator_pin(uuid, text);

CREATE OR REPLACE FUNCTION public.update_operator_pin(
  p_profile_id UUID,
  p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_caller_tenant_id UUID;
BEGIN
  -- Get caller's tenant_id
  SELECT tenant_id INTO v_caller_tenant_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get target profile's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = p_profile_id;

  -- Verify caller is admin in the same tenant
  IF v_tenant_id != v_caller_tenant_id THEN
    RAISE EXCEPTION 'Cannot update operator from different tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update operator PINs';
  END IF;

  -- Validate PIN
  IF p_new_pin IS NULL OR length(p_new_pin) < 4 OR length(p_new_pin) > 6 THEN
    RAISE EXCEPTION 'PIN must be 4-6 characters';
  END IF;

  -- Update the PIN
  UPDATE profiles
  SET pin_hash = crypt(p_new_pin, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_profile_id
    AND tenant_id = v_tenant_id;

  RETURN FOUND;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_operator_pin(uuid, text) TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON FUNCTION public.create_operator_with_pin IS
  'Creates an operator/worker profile with PIN-based authentication. Workers can be shop floor personnel who login via Employee ID + PIN.';

COMMENT ON FUNCTION public.verify_operator_pin IS
  'Verifies operator credentials (employee_id + PIN) and returns profile data if valid. Used for PIN-based login on operator terminals.';

COMMENT ON FUNCTION public.create_machine_worker IS
  'Creates a machine worker profile that reports progress via API. Returns the profile_id and a one-time API key for the machine to use.';

COMMENT ON FUNCTION public.update_operator_pin IS
  'Updates an operator''s PIN. Only admins in the same tenant can update PINs.';
