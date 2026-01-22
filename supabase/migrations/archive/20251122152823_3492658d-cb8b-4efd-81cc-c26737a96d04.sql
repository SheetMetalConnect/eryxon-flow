-- Update handle_new_user function to create tenants with 'suspended' status
-- New signups require manual approval before they can use the system

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_username TEXT;
  v_full_name TEXT;
  v_role app_role;
  v_tenant_status subscription_status;
  v_is_new_tenant BOOLEAN := false;
BEGIN
  -- Extract metadata
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  v_tenant_status := COALESCE((NEW.raw_user_meta_data->>'tenant_status')::subscription_status, 'trial');
  
  -- Check if tenant_id provided (invitation flow)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operator');
  ELSE
    -- New signup - create tenant with suspended status for manual approval
    v_is_new_tenant := true;
    v_role := 'admin'; -- First user is always admin
    
    INSERT INTO public.tenants (
      name,
      company_name,
      plan,
      status
    ) VALUES (
      COALESCE(v_company_name, v_username || '''s Organization'),
      v_company_name,
      'free', -- Default to free plan
      v_tenant_status -- Will be 'suspended' for new signups
    )
    RETURNING id INTO v_tenant_id;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    is_machine,
    active
  ) VALUES (
    NEW.id,
    v_tenant_id,
    v_username,
    v_full_name,
    NEW.email,
    v_role,
    COALESCE((NEW.raw_user_meta_data->>'is_machine')::BOOLEAN, false),
    true
  );
  
  -- Create user_roles entry for RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  RETURN NEW;
END;
$function$;