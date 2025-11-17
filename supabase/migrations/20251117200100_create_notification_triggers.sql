-- Triggers to automatically create notifications for various events

-- Trigger for new issues
CREATE OR REPLACE FUNCTION public.notify_new_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
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
        'issue',
        NEW.severity::TEXT,
        'New Issue Reported',
        NEW.description,
        '/admin/issues',
        'issue',
        NEW.id,
        jsonb_build_object('issue_id', NEW.id, 'severity', NEW.severity)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_issue
  AFTER INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_issue();

-- Trigger for new parts
CREATE OR REPLACE FUNCTION public.notify_new_part()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        'Part ' || COALESCE(NEW.name, 'Unnamed') || ' added to Job ' || COALESCE(v_job_number::TEXT, 'Unknown'),
        '/admin/jobs',
        'part',
        NEW.id,
        jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_name', NEW.name)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_part
  AFTER INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_part();

-- Trigger for new users
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Only notify for new non-admin users
  IF NEW.role != 'admin' THEN
    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = NEW.tenant_id AND role = 'admin' AND id != NEW.id;

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          NEW.tenant_id,
          v_admin_id,
          'new_user',
          'low',
          'New User Joined',
          COALESCE(NEW.full_name, 'A new user') || ' has joined as ' || NEW.role,
          '/admin/config/users',
          'user',
          NEW.id,
          jsonb_build_object('user_id', NEW.id, 'full_name', NEW.full_name, 'role', NEW.role)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();

-- Trigger for new assignments
CREATE OR REPLACE FUNCTION public.notify_new_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_number TEXT;
  v_part_name TEXT;
BEGIN
  -- Get job and part details for context
  SELECT j.job_number INTO v_job_number
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  IF NEW.part_id IS NOT NULL THEN
    SELECT p.name INTO v_part_name
    FROM public.parts p
    WHERE p.id = NEW.part_id;
  END IF;

  -- Create notification for the assigned operator
  PERFORM public.create_notification(
    NEW.tenant_id,
    NEW.operator_id,
    'assignment',
    'medium',
    'New Assignment',
    'You have been assigned to Job ' || COALESCE(v_job_number::TEXT, 'Unknown') ||
    CASE WHEN v_part_name IS NOT NULL THEN ' - Part: ' || v_part_name ELSE '' END,
    '/operator/dashboard',
    'assignment',
    NEW.id,
    jsonb_build_object(
      'assignment_id', NEW.id,
      'job_id', NEW.job_id,
      'part_id', NEW.part_id,
      'job_number', v_job_number,
      'part_name', v_part_name
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_assignment
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_assignment();

-- Trigger for jobs due soon (runs daily via cron or can be called manually)
CREATE OR REPLACE FUNCTION public.check_jobs_due_soon()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_count INTEGER := 0;
  v_days_until_due INTEGER;
  v_severity TEXT;
BEGIN
  -- Check for jobs due within the next 7 days
  FOR v_job IN
    SELECT id, tenant_id, job_number, customer, due_date
    FROM public.jobs
    WHERE status != 'completed'
      AND due_date IS NOT NULL
      AND due_date <= (CURRENT_DATE + INTERVAL '7 days')
      AND due_date >= CURRENT_DATE
      -- Don't create duplicate notifications (check if one was created in the last 24 hours)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE reference_type = 'job'
          AND reference_id = jobs.id
          AND type = 'job_due'
          AND created_at > now() - INTERVAL '24 hours'
      )
  LOOP
    -- Calculate days until due
    v_days_until_due := EXTRACT(DAY FROM (v_job.due_date - CURRENT_DATE));

    -- Set severity based on days until due
    IF v_days_until_due <= 1 THEN
      v_severity := 'high';
    ELSIF v_days_until_due <= 3 THEN
      v_severity := 'medium';
    ELSE
      v_severity := 'low';
    END IF;

    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = v_job.tenant_id AND role = 'admin';

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          v_job.tenant_id,
          v_admin_id,
          'job_due',
          v_severity,
          'Job Due Soon',
          'JOB-' || v_job.job_number || ' - ' || COALESCE(v_job.customer, 'No customer') ||
          ' is due in ' || v_days_until_due || ' day(s)',
          '/admin/jobs',
          'job',
          v_job.id,
          jsonb_build_object(
            'job_id', v_job.id,
            'job_number', v_job.job_number,
            'customer', v_job.customer,
            'due_date', v_job.due_date,
            'days_until_due', v_days_until_due
          )
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_jobs_due_soon TO authenticated;

-- Trigger for part completion
CREATE OR REPLACE FUNCTION public.notify_part_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
          'Part ' || COALESCE(NEW.name, 'Unnamed') || ' for Job ' || COALESCE(v_job_number::TEXT, 'Unknown') || ' has been completed',
          '/admin/jobs',
          'part',
          NEW.id,
          jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_name', NEW.name)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_part_completed
  AFTER UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_part_completed();

-- Comment on functions
COMMENT ON FUNCTION public.notify_new_issue() IS 'Automatically creates notifications when new issues are reported';
COMMENT ON FUNCTION public.notify_new_part() IS 'Automatically creates notifications when new parts are added';
COMMENT ON FUNCTION public.notify_new_user() IS 'Automatically creates notifications when new users join';
COMMENT ON FUNCTION public.notify_new_assignment() IS 'Automatically creates notifications when operators are assigned to jobs';
COMMENT ON FUNCTION public.check_jobs_due_soon() IS 'Checks for jobs due soon and creates notifications - can be run via cron';
COMMENT ON FUNCTION public.notify_part_completed() IS 'Automatically creates notifications when parts are marked as completed';
