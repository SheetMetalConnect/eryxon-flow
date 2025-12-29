
-- Simulate completing a late job to test exception detection
-- Using JOB-001 which was due 2025-11-28 and is now overdue
UPDATE jobs 
SET status = 'completed', updated_at = now()
WHERE job_number = 'JOB-001'
  AND tenant_id = 'e2ef389e-731a-4ebf-b3b3-42da6632c076';
