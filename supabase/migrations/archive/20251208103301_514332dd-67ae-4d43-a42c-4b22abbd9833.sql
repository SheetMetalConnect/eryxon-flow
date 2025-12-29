-- Fix create_invitation to allow inviting existing users to join a new tenant
-- The invitation flow should work for both new and existing users

CREATE OR REPLACE FUNCTION public.create_invitation(p_email text, p_role app_role DEFAULT 'operator'::app_role, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());
  
  -- Only admins can create invitations
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check if user already exists in THIS tenant
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id AND LOWER(email) = LOWER(p_email)) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;
  
  -- Check for pending invitation to THIS tenant
  IF EXISTS (SELECT 1 FROM public.invitations WHERE LOWER(email) = LOWER(p_email) AND tenant_id = v_tenant_id AND status = 'pending') THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;
  
  -- Generate URL-safe token
  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_'), '+', '-'), '=', '');
  
  -- Create the invitation (works for both new and existing users)
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (v_tenant_id, LOWER(p_email), p_role, v_token, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$function$;

-- Update accept_invitation to handle existing users joining new tenants
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation RECORD;
  v_existing_profile_id UUID;
BEGIN
  -- Find and validate the invitation
  SELECT id, tenant_id, email, role
  INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check if user already has a profile in this tenant
  SELECT id INTO v_existing_profile_id 
  FROM profiles 
  WHERE id = p_user_id AND tenant_id = v_invitation.tenant_id;

  IF v_existing_profile_id IS NOT NULL THEN
    -- User already in this tenant, just mark invitation as accepted
    UPDATE invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_user_id
    WHERE id = v_invitation.id;
    
    RETURN TRUE;
  END IF;

  -- For existing users in other tenants, we need to create a new profile for this tenant
  -- This is handled by the frontend/auth flow - the user will sign up with the invitation token
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$function$;