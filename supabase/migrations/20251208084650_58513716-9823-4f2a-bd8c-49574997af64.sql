-- Complete invitation system overhaul

-- Drop and recreate accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation_id UUID;
  v_tenant_id UUID;
  v_email TEXT;
  v_role app_role;
BEGIN
  -- Find and validate the invitation
  SELECT id, tenant_id, email, role
  INTO v_invitation_id, v_tenant_id, v_email, v_role
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = v_invitation_id;

  RETURN TRUE;
END;
$$;

-- Drop and recreate cancel_invitation function
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_user_tenant_id();

  -- Check permission
  IF get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can cancel invitations';
  END IF;

  -- Update invitation status
  UPDATE invitations
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_invitation_id
    AND tenant_id = v_tenant_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;