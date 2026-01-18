-- ============================================================
-- OPERATOR MANAGEMENT CONSOLIDATION
-- ============================================================
-- This migration consolidates the operator (PIN-based employee) system:
-- - Uses the `operators` table as the source of truth
-- - Adds security features (failed attempts, lockout)
-- - Provides clean RPC functions for creation and verification
-- ============================================================

-- Add security and tracking columns to operators table
ALTER TABLE public.operators
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Ensure all required columns exist
ALTER TABLE public.operators
ALTER COLUMN active SET DEFAULT true;

-- Index for security lookups
CREATE INDEX IF NOT EXISTS idx_operators_security
ON public.operators(tenant_id, employee_id, active)
WHERE active = true;

-- ============================================================
-- DROP ALL OLD FUNCTION VERSIONS
-- ============================================================
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text);
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text, public.app_role);
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text, text, uuid);
DROP FUNCTION IF EXISTS public.create_operator_with_pin(text, text);
DROP FUNCTION IF EXISTS public.verify_operator_pin(text, text);

-- ============================================================
-- CREATE OPERATOR WITH PIN
-- ============================================================
-- Creates a PIN-based operator in the operators table.
-- These are shop floor employees who log in via ID + PIN.
-- No auth.users account is created - they work within an authenticated session.
-- ============================================================
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
  IF p_employee_id IS NOT NULL AND TRIM(p_employee_id) != '' THEN
    v_employee_id := UPPER(TRIM(p_employee_id));

    -- Check if employee ID is unique within tenant
    IF EXISTS (
      SELECT 1 FROM operators op
      WHERE op.tenant_id = v_tenant_id
      AND UPPER(op.employee_id) = v_employee_id
    ) THEN
      RAISE EXCEPTION 'Employee ID % already exists in this organization', v_employee_id;
    END IF;
  ELSE
    -- Auto-generate employee ID using tenant abbreviation
    SELECT abbreviation, COALESCE(next_operator_number, 1)
    INTO v_abbreviation, v_operator_number
    FROM tenants WHERE id = v_tenant_id;

    -- Ensure abbreviation exists
    IF v_abbreviation IS NULL OR v_abbreviation = '' THEN
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
    tenant_id, employee_id, full_name, pin_hash, created_by, active,
    failed_attempts, locked_until
  ) VALUES (
    v_tenant_id, v_employee_id, p_full_name, v_pin_hash, auth.uid(), true,
    0, NULL
  )
  RETURNING id INTO v_new_operator_id;

  RETURN QUERY SELECT v_new_operator_id, v_employee_id, 'Operator created successfully'::TEXT;
END;
$$;

-- ============================================================
-- VERIFY OPERATOR PIN (WITH SECURITY)
-- ============================================================
-- Verifies an operator's PIN with security features:
-- - Tracks failed attempts
-- - Locks account after 5 failed attempts for 15 minutes
-- - Returns detailed error codes for UI feedback
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_operator_pin(
  p_employee_id TEXT,
  p_pin TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  operator_id UUID,
  full_name TEXT,
  employee_id TEXT,
  tenant_id UUID,
  error_code TEXT,
  error_message TEXT,
  attempts_remaining INTEGER,
  locked_until_ts TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_operator RECORD;
  v_max_attempts CONSTANT INTEGER := 5;
  v_lockout_minutes CONSTANT INTEGER := 15;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get tenant from current user context
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID,
      'NO_TENANT'::TEXT, 'No tenant found for current session'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Find operator (case-insensitive employee ID match)
  SELECT o.id, o.full_name, o.employee_id, o.pin_hash, o.tenant_id,
         COALESCE(o.failed_attempts, 0) as failed_attempts,
         o.locked_until, o.active
  INTO v_operator
  FROM operators o
  WHERE o.tenant_id = v_tenant_id
    AND UPPER(TRIM(o.employee_id)) = UPPER(TRIM(p_employee_id));

  -- Operator not found
  IF v_operator IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'NOT_FOUND'::TEXT, 'Employee ID not found'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if operator is inactive
  IF NOT COALESCE(v_operator.active, false) THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'INACTIVE'::TEXT, 'This account has been deactivated. Contact your supervisor.'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if account is locked
  IF v_operator.locked_until IS NOT NULL AND v_operator.locked_until > v_now THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'LOCKED'::TEXT,
      'Account is temporarily locked. Try again later.'::TEXT,
      0, v_operator.locked_until;
    RETURN;
  END IF;

  -- If lock has expired, reset failed attempts
  IF v_operator.locked_until IS NOT NULL AND v_operator.locked_until <= v_now THEN
    UPDATE operators SET failed_attempts = 0, locked_until = NULL
    WHERE id = v_operator.id;
    v_operator.failed_attempts := 0;
  END IF;

  -- Verify PIN
  IF v_operator.pin_hash = extensions.crypt(p_pin, v_operator.pin_hash) THEN
    -- Success! Reset failed attempts and update last login
    UPDATE operators
    SET failed_attempts = 0,
        locked_until = NULL,
        last_login_at = v_now
    WHERE id = v_operator.id;

    RETURN QUERY SELECT
      true, v_operator.id, v_operator.full_name, v_operator.employee_id, v_operator.tenant_id,
      NULL::TEXT, NULL::TEXT,
      v_max_attempts, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  ELSE
    -- Failed attempt
    v_operator.failed_attempts := v_operator.failed_attempts + 1;

    IF v_operator.failed_attempts >= v_max_attempts THEN
      -- Lock the account
      UPDATE operators
      SET failed_attempts = v_operator.failed_attempts,
          locked_until = v_now + (v_lockout_minutes || ' minutes')::INTERVAL
      WHERE id = v_operator.id;

      RETURN QUERY SELECT
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
        'LOCKED'::TEXT,
        format('Account locked. Try again in %s minutes.', v_lockout_minutes)::TEXT,
        0, (v_now + (v_lockout_minutes || ' minutes')::INTERVAL);
      RETURN;
    ELSE
      -- Update failed attempts
      UPDATE operators
      SET failed_attempts = v_operator.failed_attempts
      WHERE id = v_operator.id;

      RETURN QUERY SELECT
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
        'INVALID_PIN'::TEXT, 'Invalid PIN'::TEXT,
        (v_max_attempts - v_operator.failed_attempts), NULL::TIMESTAMP WITH TIME ZONE;
      RETURN;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- RESET OPERATOR PIN (Admin function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_operator_pin(
  p_operator_id UUID,
  p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_pin_hash TEXT;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;

  -- Validate PIN
  IF p_new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  -- Generate new PIN hash
  v_pin_hash := extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8));

  -- Update operator (also reset lockout)
  UPDATE operators
  SET pin_hash = v_pin_hash,
      failed_attempts = 0,
      locked_until = NULL
  WHERE id = p_operator_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found or access denied';
  END IF;

  RETURN true;
END;
$$;

-- ============================================================
-- UNLOCK OPERATOR (Admin function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_operator(
  p_operator_id UUID
)
RETURNS BOOLEAN
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

  UPDATE operators
  SET failed_attempts = 0,
      locked_until = NULL
  WHERE id = p_operator_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found or access denied';
  END IF;

  RETURN true;
END;
$$;

-- ============================================================
-- LIST OPERATORS FOR TENANT
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_operators()
RETURNS TABLE(
  id UUID,
  employee_id TEXT,
  full_name TEXT,
  active BOOLEAN,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
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
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.id, o.employee_id, o.full_name, COALESCE(o.active, true),
         o.locked_until, o.last_login_at, o.created_at
  FROM operators o
  WHERE o.tenant_id = v_tenant_id
  ORDER BY o.full_name;
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_operator_with_pin(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_operator_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_operator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_operators() TO authenticated;
