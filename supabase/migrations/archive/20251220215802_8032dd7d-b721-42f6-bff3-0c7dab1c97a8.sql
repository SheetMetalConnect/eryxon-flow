
-- First drop and recreate the constraint
ALTER TABLE expectations DROP CONSTRAINT IF EXISTS expectations_source_check;

ALTER TABLE expectations ADD CONSTRAINT expectations_source_check 
CHECK (source = ANY (ARRAY[
  'erp_sync'::text, 
  'manual'::text, 
  'scheduler'::text, 
  'auto_replan'::text, 
  'system'::text,
  'backfill'::text,
  'job_creation'::text,
  'job_update'::text,
  'operation_creation'::text,
  'operation_update'::text,
  'due_date_change'::text
]));
