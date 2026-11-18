-- notify_part_completed() referenced NEW.name, but the parts table has no
-- `name` column — it's `part_number`. So every update that set a part to
-- 'completed' raised `record "new" has no field "name"`, which 400-ed the
-- completion request and made finishing a job crash. Use part_number.

CREATE OR REPLACE FUNCTION "public"."notify_part_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_job_number TEXT;
BEGIN
  -- Only notify when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
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
          'part_completed',
          'low',
          'Part Completed',
          'Part ' || COALESCE(NEW.part_number, 'Unnamed') || ' for Job ' || COALESCE(v_job_number::TEXT, 'Unknown') || ' has been completed',
          '/admin/jobs',
          'part',
          NEW.id,
          jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_name', NEW.part_number)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
