-- ============================================================================
-- SIGNUP & ONBOARDING SYSTEM MIGRATION
-- Adds: Invitations, Non-Email Operators, Enhanced Organization Setup
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE TENANTS TABLE - Add organization details
-- ============================================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.timezone IS 'Timezone for shift scheduling and due dates';

-- ============================================================================
-- 2. ENHANCE PROFILES TABLE - Add non-email operator support
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_email_login BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

COMMENT ON COLUMN public.profiles.has_email_login IS 'True if user logs in with email, false for PIN-based operators';
COMMENT ON COLUMN public.profiles.employee_id IS 'Employee/Badge ID for non-email operators (unique across all tenants)';
COMMENT ON COLUMN public.profiles.pin_hash IS 'Bcrypt hash of PIN for non-email operators';

-- Index for employee_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: prevent duplicate pending invitations for same email in same tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON public.invitations(tenant_id, email)
  WHERE status = 'pending';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations in their tenant"
  ON public.invitations FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can create invitations in their tenant"
  ON public.invitations FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "Admins can update invitations in their tenant"
  ON public.invitations FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "Admins can delete invitations in their tenant"
  ON public.invitations FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

-- Note: Invitation viewing by token is handled by get_invitation_by_token() function
-- No public RLS policy needed - the function uses SECURITY DEFINER to bypass RLS

-- ============================================================================
-- 4. INVITATION MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function: Create invitation
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_email TEXT,
  p_role public.app_role DEFAULT 'operator',
  p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  -- Get current user and tenant
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());

  -- Check if user is admin
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;

  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check if user already exists in this tenant
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE tenant_id = v_tenant_id AND email = p_email
  ) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64');

  -- Create invitation
  INSERT INTO public.invitations (
    tenant_id,
    email,
    role,
    token,
    invited_by
  ) VALUES (
    v_tenant_id,
    p_email,
    p_role,
    v_token,
    v_user_id
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Function: Accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = p_user_id,
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Return invitation details for signup process
  v_result := jsonb_build_object(
    'tenant_id', v_invitation.tenant_id,
    'role', v_invitation.role,
    'email', v_invitation.email
  );

  RETURN v_result;
END;
$$;

-- Function: Get invitation by token (for public access)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role public.app_role,
  tenant_id UUID,
  tenant_name TEXT,
  invited_by_name TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.email,
    i.role,
    i.tenant_id,
    t.name as tenant_name,
    p.full_name as invited_by_name,
    i.expires_at,
    i.status
  FROM public.invitations i
  JOIN public.tenants t ON t.id = i.tenant_id
  JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
$$;

-- Function: Cancel invitation
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can cancel invitations';
  END IF;

  -- Check if invitation belongs to user's tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.invitations
    WHERE id = p_invitation_id
      AND tenant_id = public.get_user_tenant_id()
  ) THEN
    RAISE EXCEPTION 'Invitation not found or access denied';
  END IF;

  -- Update invitation status
  UPDATE public.invitations
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_invitation_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Function: Cleanup expired invitations (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- 5. NON-EMAIL OPERATOR FUNCTIONS
-- ============================================================================

-- Function: Create operator with PIN (no email login)
CREATE OR REPLACE FUNCTION public.create_operator_with_pin(
  p_full_name TEXT,
  p_employee_id TEXT,
  p_pin TEXT,
  p_role public.app_role DEFAULT 'operator'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_pin_hash TEXT;
  v_generated_email TEXT;
  v_random_password TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Get current user and tenant
  v_user_id := auth.uid();
  v_tenant_id := public.get_user_tenant_id();

  -- Check if user is admin
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create operators';
  END IF;

  -- Validate PIN (4-6 digits)
  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  -- Check if employee_id is unique
  IF EXISTS (SELECT 1 FROM public.profiles WHERE employee_id = p_employee_id) THEN
    RAISE EXCEPTION 'Employee ID already exists';
  END IF;

  -- Hash the PIN using crypt (Bcrypt)
  v_pin_hash := crypt(p_pin, gen_salt('bf', 8));

  -- Generate a synthetic email for Supabase Auth
  v_generated_email := 'operator-' || p_employee_id || '@internal.eryxon.local';

  -- Generate a random password (won't be used, but required by Supabase Auth)
  v_random_password := encode(gen_random_bytes(32), 'base64');

  -- Create auth user with synthetic email
  -- This creates the user in auth.users which profiles.id references
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    v_generated_email,
    crypt(v_random_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'username', p_employee_id,
      'full_name', p_full_name,
      'role', p_role,
      'tenant_id', v_tenant_id,
      'has_email_login', false,
      'employee_id', p_employee_id
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_auth_user_id;

  -- The handle_new_user trigger will create the profile automatically
  -- But we need to update it with PIN hash and employee_id
  UPDATE public.profiles
  SET
    has_email_login = false,
    employee_id = p_employee_id,
    pin_hash = v_pin_hash
  WHERE id = v_auth_user_id;

  RETURN v_auth_user_id;
END;
$$;

-- Function: Validate PIN login
CREATE OR REPLACE FUNCTION public.validate_pin_login(
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
  v_result JSONB;
BEGIN
  -- Get profile with employee_id
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE employee_id = p_employee_id
    AND has_email_login = false
    AND active = true;

  -- Check if profile exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid employee ID or PIN';
  END IF;

  -- Validate PIN using crypt
  IF v_profile.pin_hash != crypt(p_pin, v_profile.pin_hash) THEN
    RAISE EXCEPTION 'Invalid employee ID or PIN';
  END IF;

  -- Return profile info
  v_result := jsonb_build_object(
    'id', v_profile.id,
    'employee_id', v_profile.employee_id,
    'full_name', v_profile.full_name,
    'role', v_profile.role,
    'tenant_id', v_profile.tenant_id
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on invitations
CREATE OR REPLACE FUNCTION public.update_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_invitations_updated_at();

-- ============================================================================
-- 7. UPDATE TENANT CREATION TO USE COMPANY NAME
-- ============================================================================

-- Update the handle_new_tenant function to use company_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
BEGIN
  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    -- Get company name from auth.users metadata
    SELECT raw_user_meta_data->>'company_name'
    INTO v_company_name
    FROM auth.users
    WHERE id = NEW.id;

    -- Create new tenant with free plan defaults
    INSERT INTO public.tenants (
      id,
      name,
      company_name,
      plan,
      status,
      max_jobs,
      max_parts_per_month,
      max_storage_gb,
      contact_email
    ) VALUES (
      NEW.tenant_id,
      COALESCE(v_company_name, NEW.full_name || '''s Organization', 'New Organization'),
      v_company_name,
      'free',
      'active',
      100,
      1000,
      5,
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_operator_with_pin TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pin_login TO anon, authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
