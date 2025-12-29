
-- Create the exception detection trigger on jobs
DROP TRIGGER IF EXISTS detect_job_completion_exception_trigger ON jobs;
CREATE TRIGGER detect_job_completion_exception_trigger
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION detect_job_completion_exception();

-- Create operation exception detection function
CREATE OR REPLACE FUNCTION public.detect_operation_completion_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expectation RECORD;
  v_deviation_minutes NUMERIC;
BEGIN
  -- Only run when operation status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find the active expectation for this operation
    SELECT * INTO v_expectation
    FROM expectations
    WHERE entity_type = 'operation'
      AND entity_id = NEW.id
      AND expectation_type = 'completion_time'
      AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND AND v_expectation.expected_at IS NOT NULL THEN
      v_deviation_minutes := EXTRACT(EPOCH FROM (now() - v_expectation.expected_at)) / 60;
      
      -- If completed late (more than 1 minute after expected)
      IF v_deviation_minutes > 1 THEN
        INSERT INTO exceptions (
          tenant_id,
          expectation_id,
          exception_type,
          status,
          actual_value,
          occurred_at,
          deviation_amount,
          deviation_unit,
          metadata
        ) VALUES (
          NEW.tenant_id,
          v_expectation.id,
          'late',
          'open',
          jsonb_build_object('completed_at', now()),
          now(),
          v_deviation_minutes,
          'minutes',
          jsonb_build_object('operation_name', NEW.operation_name)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for operations
DROP TRIGGER IF EXISTS detect_operation_completion_exception_trigger ON operations;
CREATE TRIGGER detect_operation_completion_exception_trigger
  AFTER UPDATE OF status ON operations
  FOR EACH ROW
  EXECUTE FUNCTION detect_operation_completion_exception();
