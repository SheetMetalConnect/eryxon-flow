-- Fix notify_new_part trigger to use correct field name
CREATE OR REPLACE FUNCTION public.notify_new_part()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_job_number TEXT;
BEGIN
  -- Get job number for context
  SELECT job_number INTO v_job_number
  FROM public.jobs
  WHERE id = NEW.job_id;

  -- Get all admin user IDs for the tenant
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE tenant_id = NEW.tenant_id AND role = 'admin';

  -- Create notification for each admin
  IF v_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_ids
    LOOP
      PERFORM public.create_notification(
        NEW.tenant_id,
        v_admin_id,
        'new_part',
        'low',
        'New Part Added',
        'Part ' || COALESCE(NEW.part_number, 'Unnamed') || ' added to Job ' || COALESCE(v_job_number::TEXT, 'Unknown'),
        '/admin/jobs',
        'part',
        NEW.id,
        jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_number', NEW.part_number)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;