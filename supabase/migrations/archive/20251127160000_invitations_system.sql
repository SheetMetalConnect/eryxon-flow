-- ============================================================================
-- INVITATION SYSTEM MIGRATION
-- Creates the invitations table, RPC functions, and RLS policies
-- ============================================================================

-- Create invitations table if not exists
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view invitations in their tenant" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON public.invitations;

-- RLS Policies
-- Admins can view all invitations in their tenant
CREATE POLICY "Users can view invitations in their tenant"
ON public.invitations FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update invitations in their tenant
CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.invitations FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Function: create_invitation
-- Creates a new invitation and returns the invitation ID
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_email TEXT,
  p_role public.app_role DEFAULT 'operator',
  p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
  v_existing_count INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant_id from parameter or current user
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found';
  END IF;

  -- Verify user is admin
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;

  -- Check for existing pending invitation
  SELECT COUNT(*) INTO v_existing_count
  FROM invitations
  WHERE email = LOWER(p_email)
    AND tenant_id = v_tenant_id
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;

  -- Check if user already exists in tenant
  SELECT COUNT(*) INTO v_existing_count
  FROM profiles
  WHERE LOWER(email) = LOWER(p_email)
    AND tenant_id = v_tenant_id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'A user with this email already exists in this organization';
  END IF;

  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create invitation
  INSERT INTO invitations (
    tenant_id,
    email,
    role,
    token,
    invited_by,
    status,
    expires_at
  ) VALUES (
    v_tenant_id,
    LOWER(p_email),
    p_role,
    v_token,
    v_user_id,
    'pending',
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Function: get_invitation_by_token
-- Returns invitation details by token (public - no auth required)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  email TEXT,
  role public.app_role,
  status TEXT,
  expires_at TIMESTAMPTZ,
  invited_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.tenant_id,
    t.name AS tenant_name,
    i.email,
    i.role,
    i.status,
    i.expires_at,
    p.full_name AS invited_by_name
  FROM invitations i
  JOIN tenants t ON t.id = i.tenant_id
  JOIN profiles p ON p.id = i.invited_by
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
END;
$$;

-- Function: accept_invitation
-- Marks an invitation as accepted
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invitation_id UUID;
BEGIN
  -- Find and update the invitation
  UPDATE invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = p_user_id,
    updated_at = NOW()
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  RETURNING id INTO v_invitation_id;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  RETURN TRUE;
END;
$$;

-- Function: cancel_invitation
-- Cancels a pending invitation
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := get_user_tenant_id();

  -- Verify user is admin
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can cancel invitations';
  END IF;

  -- Cancel the invitation
  UPDATE invitations
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_invitation_id
    AND tenant_id = v_tenant_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  RETURN TRUE;
END;
$$;

-- Function: cleanup_expired_invitations
-- Marks expired invitations as expired (can be run by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE invitations
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_invitation(TEXT, public.app_role, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invitations() TO authenticated;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_invitations_updated_at ON public.invitations;
CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
