-- Fix notify_new_assignment function: parts table has part_number, not name
CREATE OR REPLACE FUNCTION public.notify_new_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_job_number TEXT;
  v_part_number TEXT;
BEGIN
  -- Get job and part details for context
  SELECT j.job_number INTO v_job_number
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  IF NEW.part_id IS NOT NULL THEN
    SELECT p.part_number INTO v_part_number
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
    CASE WHEN v_part_number IS NOT NULL THEN ' - Part: ' || v_part_number ELSE '' END,
    '/operator/dashboard',
    'assignment',
    NEW.id,
    jsonb_build_object(
      'assignment_id', NEW.id,
      'job_id', NEW.job_id,
      'part_id', NEW.part_id,
      'job_number', v_job_number,
      'part_number', v_part_number
    )
  );

  RETURN NEW;
END;
$function$;