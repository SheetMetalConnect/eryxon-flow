-- ============================================================================
-- VERIFY OPERATOR PIN - Terminal Login Authentication
-- ============================================================================
-- This function allows operators to authenticate using their employee_id and PIN
-- instead of email/password. Used by factory terminal login screens.
--
-- Returns:
--   - success: boolean indicating if authentication was successful
--   - user_id: the operator's profile ID (if successful)
--   - access_token: JWT access token (if successful)
--   - refresh_token: JWT refresh token (if successful)
--   - error: error message (if failed)
-- ============================================================================

-- First, ensure pgcrypto extension is available for crypt function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.verify_operator_pin(TEXT, TEXT);

-- Create the verify_operator_pin function
CREATE OR REPLACE FUNCTION public.verify_operator_pin(
  p_employee_id TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_is_valid BOOLEAN;
  v_access_token TEXT;
  v_refresh_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Validate input
  IF p_employee_id IS NULL OR p_employee_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Employee ID is required'
    );
  END IF;

  IF p_pin IS NULL OR LENGTH(p_pin) < 4 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PIN must be at least 4 digits'
    );
  END IF;

  -- Find the operator by employee_id
  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE UPPER(employee_id) = UPPER(p_employee_id)
    AND active = true
    AND role = 'operator'
  LIMIT 1;

  -- Check if operator exists
  IF v_profile IS NULL THEN
    -- Log failed attempt (don't reveal if user exists)
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid credentials'
    );
  END IF;

  -- Check if operator has a PIN set
  IF v_profile.pin_hash IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PIN login not configured for this user'
    );
  END IF;

  -- Verify the PIN using crypt (same method as create_operator_with_pin)
  -- The pin_hash is stored as crypt(pin, gen_salt('bf'))
  SELECT v_profile.pin_hash = crypt(p_pin, v_profile.pin_hash)
  INTO v_is_valid;

  IF NOT v_is_valid THEN
    -- Log failed attempt
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid credentials'
    );
  END IF;

  -- PIN is valid - create a session
  -- Generate tokens using Supabase's auth system
  -- Note: This requires the supabase_auth_admin role

  -- Calculate token expiry (24 hours for terminal sessions)
  v_expires_at := NOW() + INTERVAL '24 hours';

  -- For security, we'll use Supabase's built-in auth token generation
  -- This requires calling the auth API from the application layer
  -- Return success with user info so the app can create the session

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_profile.id,
    'tenant_id', v_profile.tenant_id,
    'full_name', v_profile.full_name,
    'role', v_profile.role,
    'employee_id', v_profile.employee_id
  );
END;
$$;

-- Grant execute permission to authenticated and anon users (for login)
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.verify_operator_pin IS
  'Verify operator credentials using employee ID and PIN. Returns user info for session creation.';

-- ============================================================================
-- Add index on employee_id for faster lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id_active
ON public.profiles (UPPER(employee_id))
WHERE active = true AND role = 'operator';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- The function returns user info instead of tokens because generating
-- Supabase auth tokens requires admin API access which isn't available
-- in SQL functions. The application layer should:
--
-- 1. Call verify_operator_pin to validate credentials
-- 2. If successful, use Supabase Admin API to create a session
-- 3. Or implement a custom JWT token system for terminal sessions
--
-- Alternative approach: Use supabase.auth.signInWithPassword with a
-- generated email format like: {employee_id}@terminal.local
-- ============================================================================
