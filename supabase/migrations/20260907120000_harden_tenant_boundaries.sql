-- Security boundaries apply to browser SQL and service-role APIs alike.
-- Rollback: restore prior function/policy definitions only after assessing exposure.
-- No tenant records or stored objects are rewritten or deleted by this migration.

ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS resumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_hash text;

ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS sync_hash text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS sync_hash text;

CREATE OR REPLACE FUNCTION public.assert_tenant_admin(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN; END IF;
  IF auth.uid() IS NULL OR p_tenant_id IS DISTINCT FROM public.get_user_tenant_id()
     OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Tenant administrator required' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_tenant_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_tenant_admin(uuid) TO authenticated, service_role;

-- Invoker security preserves the distinction between direct table writes and
-- trusted SECURITY DEFINER functions such as signup and tenant switching.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_root_admin THEN
      RAISE EXCEPTION 'Platform profiles require privileged administration' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_root_admin, false) OR NEW.active_tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'Platform privileges cannot be assigned here' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.is_root_admin IS DISTINCT FROM OLD.is_root_admin
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.active_tenant_id IS DISTINCT FROM OLD.active_tenant_id THEN
    RAISE EXCEPTION 'Platform privileges and tenant membership are protected' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_profile_privileges
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.protect_tenant_subscription()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND
    (to_jsonb(NEW) - ARRAY[
      'name','company_name','billing_email','timezone','updated_at',
      'onboarding_completed_at','demo_mode_acknowledged','vat_number','billing_country_code',
      'preferred_payment_method','factory_opening_time','factory_closing_time',
      'auto_stop_tracking','working_days_mask','whitelabel_logo_url','whitelabel_app_name',
      'whitelabel_primary_color','whitelabel_favicon_url','abbreviation',
      'feature_flags','use_external_feature_flags','location_tracking_enabled'
    ]) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY[
      'name','company_name','billing_email','timezone','updated_at',
      'onboarding_completed_at','demo_mode_acknowledged','vat_number','billing_country_code',
      'preferred_payment_method','factory_opening_time','factory_closing_time',
      'auto_stop_tracking','working_days_mask','whitelabel_logo_url','whitelabel_app_name',
      'whitelabel_primary_color','whitelabel_favicon_url','abbreviation',
      'feature_flags','use_external_feature_flags','location_tracking_enabled'
    ]) THEN
    RAISE EXCEPTION 'Subscription and usage fields require privileged administration' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_tenant_subscription BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.protect_tenant_subscription();

DROP POLICY IF EXISTS "Admins can manage all roles in their tenant" ON public.user_roles;
CREATE POLICY "Admins can manage all roles in their tenant" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id AND p.tenant_id = public.get_user_tenant_id()
  ))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id AND p.tenant_id = public.get_user_tenant_id()
  ));

CREATE OR REPLACE FUNCTION public.owns_storage_object(p_bucket text, p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    split_part(p_name, '/', 1) = public.get_user_tenant_id()::text
    OR (p_bucket = 'batch-images' AND EXISTS (
      SELECT 1 FROM public.operation_batches b
      WHERE b.id::text = split_part(p_name, '/', 1)
        AND b.tenant_id = public.get_user_tenant_id()
    ))
  );
$$;
REVOKE ALL ON FUNCTION public.owns_storage_object(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_storage_object(text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can upload part images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view part images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete part images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view issue attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload CAD files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view CAD files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete CAD files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload batch images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view batch images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete batch images" ON storage.objects;

CREATE POLICY "Tenant private objects" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('parts-images','parts-cad','issues','batch-images')
    AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id IN ('parts-images','parts-cad','issues','batch-images')
    AND public.owns_storage_object(bucket_id, name));
-- Restrictive policy also constrains older permissive policies on upgraded stacks.
CREATE POLICY "Private object tenant boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id NOT IN ('parts-images','parts-cad','issues','batch-images')
    OR public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id NOT IN ('parts-images','parts-cad','issues','batch-images')
    OR public.owns_storage_object(bucket_id, name));

CREATE OR REPLACE FUNCTION public.seed_demo_operators(p_tenant_id uuid)
RETURNS TABLE(created_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_admin uuid;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  SELECT COUNT(*)
  INTO v_count
  FROM public.operators
  WHERE tenant_id = p_tenant_id
    AND employee_id LIKE 'DEMO%';

  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::integer, 'Demo operators already exist for this tenant'::text;
    RETURN;
  END IF;

  SELECT id
  INTO v_admin
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.operators (
    tenant_id,
    employee_id,
    full_name,
    pin_hash,
    active,
    created_by
  )
  VALUES
    (p_tenant_id, 'DEMO1', 'Demo Operator - John Smith', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO2', 'Demo Operator - Maria Garcia', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO3', 'Demo Operator - Wei Chen', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO4', 'Demo Operator - Sarah Johnson', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY
    SELECT
      v_count,
      format(
        'Created %s demo operators. Terminal login: employee IDs DEMO1-DEMO4, PIN 1234.',
        v_count
      )::text;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_demo_operators(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_operators(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_demo_operator_assignment(p_tenant_id uuid)
RETURNS TABLE(assignment_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_operator uuid;
  v_part uuid;
  v_job uuid;
  v_admin uuid;
  v_existing uuid;
  v_new uuid;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  SELECT a.id INTO v_existing
  FROM public.assignments a
  WHERE a.tenant_id = p_tenant_id
    AND a.shop_floor_operator_id IS NOT NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing, 'Tenant already has a shop-floor assignment'::text;
    RETURN;
  END IF;

  SELECT id INTO v_operator
  FROM public.operators
  WHERE tenant_id = p_tenant_id
    AND employee_id LIKE 'DEMO%'
    AND active
  ORDER BY employee_id
  LIMIT 1;

  IF v_operator IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'No demo operator found - run seed_demo_operators first'::text;
    RETURN;
  END IF;

  SELECT id INTO v_admin
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'No tenant profile available to record assigned_by'::text;
    RETURN;
  END IF;

  SELECT p.id, p.job_id
  INTO v_part, v_job
  FROM public.parts p
  WHERE p.tenant_id = p_tenant_id
  ORDER BY p.created_at
  LIMIT 1;

  IF v_part IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'No part available to assign'::text;
    RETURN;
  END IF;

  INSERT INTO public.assignments (
    tenant_id,
    part_id,
    job_id,
    assigned_by,
    shop_floor_operator_id,
    status
  )
  VALUES (p_tenant_id, v_part, v_job, v_admin, v_operator, 'assigned')
  RETURNING id INTO v_new;

  RETURN QUERY SELECT v_new, 'Created 1 shop-floor assignment for operator testing'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_demo_operator_assignment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_operator_assignment(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") RETURNS TABLE("created_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
  v_resource_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Resources already exist for this tenant'::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.resources (id, tenant_id, name, type, identifier, description, location, status, metadata)
  VALUES
    (v_resource_ids[1], p_tenant_id, 'Enclosure Mold #1', 'mold', 'MOLD-001',
     '400x300mm sheet metal enclosure mold', 'Press Station 1', 'available',
     '{"moldId": "MOLD-001", "moldName": "Enclosure Mold #1", "cavities": 1, "tonnage": 150, "setupTime": 30, "cycleTime": 45}'::jsonb),
    (v_resource_ids[2], p_tenant_id, 'Bracket Forming Die', 'mold', 'MOLD-002',
     'L-bracket forming die set', 'Press Station 2', 'available',
     '{"moldId": "MOLD-002", "moldName": "Bracket Die", "cavities": 2, "tonnage": 80, "setupTime": 20, "cycleTime": 30}'::jsonb),
    (v_resource_ids[3], p_tenant_id, 'Laser Cutting Head - Fiber 3kW', 'tooling', 'TOOL-LC-001',
     'High-precision fiber laser cutting head', 'Laser Cell', 'in_use',
     '{"toolId": "TOOL-LC-001", "toolType": "cutting", "material": "Carbide", "lifeExpectancy": 10000, "currentUses": 3250}'::jsonb),
    (v_resource_ids[4], p_tenant_id, 'V-Die Set 90° - 2mm', 'tooling', 'TOOL-BD-001',
     'Standard V-die for 90-degree bends in 2mm material', 'Bending Cell', 'available',
     '{"toolId": "TOOL-BD-001", "toolType": "forming", "diameter": 2, "length": 1000}'::jsonb),
    (v_resource_ids[5], p_tenant_id, 'Spot Welding Gun #3', 'tooling', 'TOOL-WD-003',
     'Pneumatic spot welding gun', 'Welding Cell', 'available',
     '{"toolId": "TOOL-WD-003", "toolType": "welding", "maintenanceDue": "2025-12-15"}'::jsonb),
    (v_resource_ids[6], p_tenant_id, 'Welding Fixture - Panel Assembly', 'fixture', 'FIX-001',
     'Custom fixture for panel welding alignment', 'Welding Cell', 'available',
     '{"fixtureId": "FIX-001", "fixtureType": "welding", "capacity": 10, "calibrationDue": "2025-11-30"}'::jsonb),
    (v_resource_ids[7], p_tenant_id, 'QC Inspection Gauge Set', 'fixture', 'FIX-QC-001',
     'Precision measurement gauge set for QC', 'Quality Control', 'available',
     '{"fixtureId": "FIX-QC-001", "fixtureType": "inspection", "calibrationDue": "2025-12-01", "certificationNumber": "CAL-2024-1156"}'::jsonb),
    (v_resource_ids[8], p_tenant_id, 'SS304 Sheet - 2mm', 'material', 'MAT-SS304-2',
     'Stainless steel 304 sheet stock, 2mm thickness', 'Material Storage A', 'available',
     '{"materialType": "Stainless Steel", "grade": "304", "thickness": 2, "width": 1220, "length": 2440, "finish": "2B", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-8834"}'::jsonb),
    (v_resource_ids[9], p_tenant_id, 'AL6061 Sheet - 3mm', 'material', 'MAT-AL6061-3',
     'Aluminum 6061-T6 sheet stock, 3mm thickness', 'Material Storage B', 'available',
     '{"materialType": "Aluminum", "grade": "6061-T6", "thickness": 3, "width": 1220, "length": 2440, "finish": "Mill", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-9012"}'::jsonb);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully created %s demo resources', v_count)::TEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_demo_resources(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_resources(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") RETURNS TABLE("inserted_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  SELECT COUNT(*) INTO v_count FROM public.scrap_reasons WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Scrap reasons already exist for this tenant'::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.scrap_reasons (tenant_id, code, description, category)
  VALUES
    (p_tenant_id, 'MAT-001', 'Material surface defect', 'Material'),
    (p_tenant_id, 'MAT-002', 'Material thickness out of spec', 'Material'),
    (p_tenant_id, 'MAT-003', 'Material contamination', 'Material'),
    (p_tenant_id, 'MAT-004', 'Material hardness issue', 'Material'),
    (p_tenant_id, 'MAT-005', 'Wrong material supplied', 'Material'),
    (p_tenant_id, 'PRC-001', 'Cutting burn marks', 'Process'),
    (p_tenant_id, 'PRC-002', 'Bend angle out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-003', 'Weld defect - porosity', 'Process'),
    (p_tenant_id, 'PRC-004', 'Weld defect - undercut', 'Process'),
    (p_tenant_id, 'PRC-005', 'Surface finish defect', 'Process'),
    (p_tenant_id, 'PRC-006', 'Dimensions out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-007', 'Deburring incomplete', 'Process'),
    (p_tenant_id, 'PRC-008', 'Coating defect - runs/sags', 'Process'),
    (p_tenant_id, 'PRC-009', 'Coating defect - insufficient coverage', 'Process'),
    (p_tenant_id, 'EQP-001', 'Machine calibration drift', 'Equipment'),
    (p_tenant_id, 'EQP-002', 'Tool wear excessive', 'Equipment'),
    (p_tenant_id, 'EQP-003', 'Equipment malfunction', 'Equipment'),
    (p_tenant_id, 'EQP-004', 'Fixture/tooling damage', 'Equipment'),
    (p_tenant_id, 'EQP-005', 'Clamp marks on part', 'Equipment'),
    (p_tenant_id, 'OPR-001', 'Setup error', 'Operator'),
    (p_tenant_id, 'OPR-002', 'Wrong operation performed', 'Operator'),
    (p_tenant_id, 'OPR-003', 'Handling damage', 'Operator'),
    (p_tenant_id, 'OPR-004', 'Incorrect measurement', 'Operator'),
    (p_tenant_id, 'OPR-005', 'Assembly error', 'Operator'),
    (p_tenant_id, 'DSN-001', 'Design dimension error', 'Design'),
    (p_tenant_id, 'DSN-002', 'Design manufacturability issue', 'Design'),
    (p_tenant_id, 'DSN-003', 'Tolerance stack-up problem', 'Design'),
    (p_tenant_id, 'OTH-001', 'Customer specification change', 'Other'),
    (p_tenant_id, 'OTH-002', 'Prototype/first article', 'Other'),
    (p_tenant_id, 'OTH-003', 'Rework - customer request', 'Other'),
    (p_tenant_id, 'OTH-004', 'Unknown cause - investigation needed', 'Other');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully inserted %s default scrap reasons', v_count)::TEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_default_scrap_reasons(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_scrap_reasons(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  UPDATE tenants
  SET
    demo_mode_enabled = true,
    demo_data_seeded_at = NOW(),
    demo_data_seeded_by = p_user_id
  WHERE id = p_tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enable_demo_mode(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enable_demo_mode(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  UPDATE tenants
  SET
    demo_mode_enabled = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.disable_demo_mode(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disable_demo_mode(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  UPDATE tenants
  SET demo_mode_acknowledged = true
  WHERE id = p_tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.acknowledge_demo_mode(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_demo_mode(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.increment_api_usage(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_api_usage(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reset_monthly_parts_counters() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_parts_counters() TO service_role;
-- Hosted databases provisioned before the consolidated baseline do not have this function.
DO $$
BEGIN
  IF to_regprocedure('public.log_storage_operation(uuid, text, text, bigint, jsonb)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.log_storage_operation(uuid, text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.log_storage_operation(uuid, text, text, bigint, jsonb) TO service_role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  v_invitation_id uuid;
BEGIN
  -- Extract metadata
  v_base_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', v_base_username);
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  
  -- Check if tenant_id provided (invitation flow)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    SELECT id, tenant_id, role INTO v_invitation_id, v_tenant_id, v_role
    FROM public.invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND tenant_id = (NEW.raw_user_meta_data->>'tenant_id')::uuid
      AND lower(email) = lower(NEW.email)
      AND status = 'pending' AND expires_at > now()
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Valid invitation required to join an existing tenant' USING ERRCODE = '42501';
    END IF;
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
  
  IF v_invitation_id IS NOT NULL THEN
    UPDATE public.invitations SET status = 'accepted', accepted_at = now(), accepted_by = NEW.id
    WHERE id = v_invitation_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."app_role" DEFAULT 'operator'::"public"."app_role", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $_$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());
  
  PERFORM public.assert_tenant_admin(v_tenant_id);

  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id AND LOWER(email) = LOWER(p_email)) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.invitations WHERE LOWER(email) = LOWER(p_email) AND tenant_id = v_tenant_id AND status = 'pending') THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;
  
  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_'), '+', '-'), '=', '');
  
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (v_tenant_id, LOWER(p_email), p_role, v_token, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$_$;

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Signup consumes the token atomically. This endpoint only acknowledges that
  -- result, including signups that still need email confirmation before login.
  RETURN EXISTS (SELECT 1 FROM public.invitations
    WHERE token = p_token AND accepted_by = p_user_id AND status = 'accepted');
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_tenant_storage_usage(
  p_tenant_id uuid, p_size_bytes bigint, p_operation text DEFAULT 'add'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_size_gb numeric;
BEGIN
  IF auth.role() = 'service_role' THEN
    IF p_size_bytes < 0 OR p_operation NOT IN ('add','remove','set') THEN
      RAISE EXCEPTION 'Invalid storage adjustment' USING ERRCODE = '22023';
    END IF;
    v_size_gb := p_size_bytes::numeric / 1073741824.0;
    UPDATE public.tenants SET current_storage_gb = CASE p_operation
      WHEN 'add' THEN COALESCE(current_storage_gb, 0) + v_size_gb
      WHEN 'remove' THEN GREATEST(COALESCE(current_storage_gb, 0) - v_size_gb, 0)
      ELSE v_size_gb END
    WHERE id = p_tenant_id;
  ELSE
    IF auth.uid() IS NULL OR p_tenant_id IS DISTINCT FROM public.get_user_tenant_id() THEN
      RAISE EXCEPTION 'Tenant access denied' USING ERRCODE = '42501';
    END IF;
    -- Browser uploads retain this RPC, but client-supplied sizes cannot alter quotas.
    SELECT COALESCE(sum((o.metadata->>'size')::numeric), 0) / 1073741824.0 INTO v_size_gb
    FROM storage.objects o
    WHERE o.bucket_id IN ('parts-images','parts-cad','issues','batch-images')
      AND public.owns_storage_object(o.bucket_id, o.name);
    UPDATE public.tenants SET current_storage_gb = v_size_gb WHERE id = p_tenant_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_tenant_storage_usage(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_tenant_storage_usage(uuid, bigint, text) TO authenticated, service_role;

-- Keep existing FK names and PostgREST relationships intact. Enforce tenant
-- equality on new/reassigned links without rejecting unrelated legacy updates.
CREATE OR REPLACE FUNCTION public.check_reference_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_reference uuid; v_parent_tenant uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id
     AND to_jsonb(NEW)->TG_ARGV[0] IS NOT DISTINCT FROM to_jsonb(OLD)->TG_ARGV[0] THEN
    RETURN NEW;
  END IF;
  v_reference := (to_jsonb(NEW)->>TG_ARGV[0])::uuid;
  IF v_reference IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT tenant_id FROM public.%I WHERE id = $1 FOR KEY SHARE', TG_ARGV[1])
    INTO v_parent_tenant USING v_reference;
  IF v_parent_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Related record must belong to the same tenant' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER parts_job_id_tenant_check
  AFTER INSERT OR UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('job_id', 'jobs');
CREATE CONSTRAINT TRIGGER parts_parent_part_id_tenant_check
  AFTER INSERT OR UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('parent_part_id', 'parts');
CREATE CONSTRAINT TRIGGER operations_part_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('part_id', 'parts');
CREATE CONSTRAINT TRIGGER operations_cell_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('cell_id', 'cells');
CREATE CONSTRAINT TRIGGER operations_assigned_operator_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('assigned_operator_id', 'profiles');
CREATE CONSTRAINT TRIGGER assignments_job_id_tenant_check
  AFTER INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('job_id', 'jobs');
CREATE CONSTRAINT TRIGGER assignments_part_id_tenant_check
  AFTER INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('part_id', 'parts');
CREATE CONSTRAINT TRIGGER assignments_operator_id_tenant_check
  AFTER INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operator_id', 'profiles');
CREATE CONSTRAINT TRIGGER assignments_shop_floor_operator_id_tenant_check
  AFTER INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('shop_floor_operator_id', 'operators');
CREATE CONSTRAINT TRIGGER substeps_operation_id_tenant_check
  AFTER INSERT OR UPDATE ON public.substeps
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operation_id', 'operations');
CREATE CONSTRAINT TRIGGER operation_quantities_operation_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_quantities
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operation_id', 'operations');
CREATE CONSTRAINT TRIGGER operation_quantities_scrap_reason_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_quantities
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('scrap_reason_id', 'scrap_reasons');
CREATE CONSTRAINT TRIGGER operation_batches_cell_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('cell_id', 'cells');
CREATE CONSTRAINT TRIGGER operation_batches_parent_batch_id_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('parent_batch_id', 'operation_batches');
CREATE CONSTRAINT TRIGGER batch_operations_batch_id_tenant_check
  AFTER INSERT OR UPDATE ON public.batch_operations
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('batch_id', 'operation_batches');
CREATE CONSTRAINT TRIGGER batch_operations_operation_id_tenant_check
  AFTER INSERT OR UPDATE ON public.batch_operations
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operation_id', 'operations');
CREATE CONSTRAINT TRIGGER batch_requirements_batch_id_tenant_check
  AFTER INSERT OR UPDATE ON public.batch_requirements
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('batch_id', 'operation_batches');
CREATE CONSTRAINT TRIGGER time_entries_operation_id_tenant_check
  AFTER INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operation_id', 'operations');
CREATE CONSTRAINT TRIGGER time_entries_operator_id_tenant_check
  AFTER INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operator_id', 'profiles');
CREATE CONSTRAINT TRIGGER storage_locations_cell_id_tenant_check
  AFTER INSERT OR UPDATE ON public.storage_locations
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('cell_id', 'cells');
CREATE CONSTRAINT TRIGGER part_placements_part_id_tenant_check
  AFTER INSERT OR UPDATE ON public.part_placements
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('part_id', 'parts');
CREATE CONSTRAINT TRIGGER part_placements_location_id_tenant_check
  AFTER INSERT OR UPDATE ON public.part_placements
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('location_id', 'storage_locations');
CREATE CONSTRAINT TRIGGER part_placements_operation_id_tenant_check
  AFTER INSERT OR UPDATE ON public.part_placements
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operation_id', 'operations');
CREATE CONSTRAINT TRIGGER issues_operation_id_tenant_check
  AFTER INSERT OR UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('operation_id', 'operations');
CREATE CONSTRAINT TRIGGER operation_batches_created_by_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('created_by', 'profiles');
CREATE CONSTRAINT TRIGGER operation_batches_started_by_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('started_by', 'profiles');
CREATE CONSTRAINT TRIGGER operation_batches_completed_by_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('completed_by', 'profiles');
CREATE CONSTRAINT TRIGGER assignments_assigned_by_tenant_check
  AFTER INSERT OR UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('assigned_by', 'profiles');
CREATE CONSTRAINT TRIGGER issues_created_by_tenant_check
  AFTER INSERT OR UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('created_by', 'profiles');
CREATE CONSTRAINT TRIGGER issues_reported_by_id_tenant_check
  AFTER INSERT OR UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('reported_by_id', 'profiles');
CREATE CONSTRAINT TRIGGER issues_reviewed_by_tenant_check
  AFTER INSERT OR UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('reviewed_by', 'profiles');
