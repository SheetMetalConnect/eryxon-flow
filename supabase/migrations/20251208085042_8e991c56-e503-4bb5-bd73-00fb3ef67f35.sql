-- Fix handle_new_user to generate unique usernames within tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_username TEXT;
  v_base_username TEXT;
  v_full_name TEXT;
  v_role app_role;
  v_is_new_tenant BOOLEAN := false;
  v_counter INT := 0;
BEGIN
  -- Extract metadata
  v_base_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', v_base_username);
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  
  -- Check if tenant_id provided (invitation flow)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operator');
  ELSE
    -- New signup - create tenant first
    v_is_new_tenant := true;
    v_role := 'admin'; -- First user is always admin
    
    INSERT INTO public.tenants (
      name,
      company_name,
      plan,
      status
    ) VALUES (
      COALESCE(v_company_name, v_base_username || '''s Organization'),
      v_company_name,
      'free',
      'trial'
    )
    RETURNING id INTO v_tenant_id;
  END IF;
  
  -- Generate unique username within tenant
  v_username := v_base_username;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE tenant_id = v_tenant_id AND username = v_username
  ) LOOP
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter::TEXT;
  END LOOP;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    is_machine,
    active,
    has_email_login
  ) VALUES (
    NEW.id,
    v_tenant_id,
    v_username,
    v_full_name,
    NEW.email,
    v_role,
    COALESCE((NEW.raw_user_meta_data->>'is_machine')::BOOLEAN, false),
    true,
    true
  );
  
  -- Create user_roles entry for RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  RETURN NEW;
END;
$$;