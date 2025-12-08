-- Update create_invitation to use URL-safe base64 encoding
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
  
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id AND email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;
  
  -- Generate URL-safe token (replace / with _ and + with -, remove =)
  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_'), '+', '-'), '=', '');
  
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (v_tenant_id, p_email, p_role, v_token, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$function$;

-- Also update existing tokens to be URL-safe
UPDATE public.invitations 
SET token = replace(replace(replace(token, '/', '_'), '+', '-'), '=', '')
WHERE token LIKE '%/%' OR token LIKE '%+%' OR token LIKE '%=%';