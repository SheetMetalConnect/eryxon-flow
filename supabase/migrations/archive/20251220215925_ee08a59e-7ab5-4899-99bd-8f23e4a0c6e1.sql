
-- Backfill job expectations
INSERT INTO expectations (tenant_id, entity_type, entity_id, expectation_type,
  belief_statement, expected_value, expected_at, source, context)
SELECT j.tenant_id, 'job', j.id, 'completion_time',
  format('Job %s should be completed by %s', j.job_number, to_char(j.due_date, 'YYYY-MM-DD HH24:MI')),
  jsonb_build_object('status', 'completed', 'job_number', j.job_number, 'customer', j.customer),
  j.due_date, 'backfill',
  jsonb_build_object('job_id', j.id, 'job_number', j.job_number, 'customer', j.customer)
FROM jobs j
WHERE j.due_date IS NOT NULL AND j.deleted_at IS NULL AND j.status NOT IN ('completed')
  AND NOT EXISTS (SELECT 1 FROM expectations e WHERE e.entity_id = j.id AND e.entity_type = 'job');
