
-- Operation trigger using correct column name (operation_name)
CREATE OR REPLACE FUNCTION public.auto_create_operation_expectation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  IF NEW.planned_end IS NOT NULL AND NEW.status NOT IN ('completed') THEN
    SELECT id INTO v_existing_id
    FROM expectations
    WHERE entity_type = 'operation' AND entity_id = NEW.id 
      AND expectation_type = 'completion_time' AND superseded_by IS NULL;
    
    IF v_existing_id IS NULL THEN
      INSERT INTO expectations (tenant_id, entity_type, entity_id, expectation_type,
        belief_statement, expected_value, expected_at, source, context)
      VALUES (NEW.tenant_id, 'operation', NEW.id, 'completion_time',
        format('Operation %s should complete by %s', NEW.operation_name, to_char(NEW.planned_end, 'YYYY-MM-DD HH24:MI')),
        jsonb_build_object('status', 'completed', 'operation_name', NEW.operation_name),
        NEW.planned_end,
        CASE WHEN TG_OP = 'INSERT' THEN 'operation_creation' ELSE 'operation_update' END,
        jsonb_build_object('operation_id', NEW.id, 'operation_name', NEW.operation_name));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_operation_expectation_trigger ON operations;
CREATE TRIGGER auto_create_operation_expectation_trigger
  AFTER INSERT OR UPDATE OF planned_start, planned_end, status ON operations
  FOR EACH ROW EXECUTE FUNCTION auto_create_operation_expectation();

-- Backfill operation expectations
INSERT INTO expectations (tenant_id, entity_type, entity_id, expectation_type,
  belief_statement, expected_value, expected_at, source, context)
SELECT o.tenant_id, 'operation', o.id, 'completion_time',
  format('Operation %s should complete by %s', o.operation_name, to_char(o.planned_end, 'YYYY-MM-DD HH24:MI')),
  jsonb_build_object('status', 'completed', 'operation_name', o.operation_name),
  o.planned_end, 'backfill',
  jsonb_build_object('operation_id', o.id, 'operation_name', o.operation_name, 'backfilled_at', now())
FROM operations o
WHERE o.planned_end IS NOT NULL AND o.status NOT IN ('completed')
  AND NOT EXISTS (SELECT 1 FROM expectations e WHERE e.entity_id = o.id 
    AND e.entity_type = 'operation' AND e.expectation_type = 'completion_time');
