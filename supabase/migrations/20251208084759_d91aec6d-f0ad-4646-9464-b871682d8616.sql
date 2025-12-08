-- Cancel invitations for users that already exist
UPDATE invitations 
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'pending' 
  AND LOWER(email) IN (SELECT LOWER(email) FROM profiles);

-- Update create_invitation to check across ALL tenants for existing users
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
  v_existing_email TEXT;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());
  
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check if user exists in current tenant
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id AND LOWER(email) = LOWER(p_email)) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;
  
  -- Check if user exists in ANY tenant (they need to use different flow)
  SELECT email INTO v_existing_email FROM public.profiles WHERE LOWER(email) = LOWER(p_email) LIMIT 1;
  IF v_existing_email IS NOT NULL THEN
    RAISE EXCEPTION 'This email is already registered. The user needs to be added to your organization differently.';
  END IF;
  
  -- Check for pending invitation
  IF EXISTS (SELECT 1 FROM public.invitations WHERE LOWER(email) = LOWER(p_email) AND tenant_id = v_tenant_id AND status = 'pending') THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;
  
  -- Generate URL-safe token
  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_'), '+', '-'), '=', '');
  
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (v_tenant_id, LOWER(p_email), p_role, v_token, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$function$;