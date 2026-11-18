BEGIN;

CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF;
END $$;

CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected %, got %: %', expected_state, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'Expected % but statement succeeded', expected_state;
END $$;

INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'scheduler@example.invalid', '{"username":"scheduler","full_name":"Scheduler Admin"}'),
  ('a1000000-0000-0000-0000-000000000002', 'other-scheduler@example.invalid', '{"username":"other-scheduler","full_name":"Other Scheduler"}');

SELECT set_config('test.tenant', tenant_id::text, true)
FROM public.profiles WHERE id = 'a1000000-0000-0000-0000-000000000001';
SELECT set_config('test.other_tenant', tenant_id::text, true)
FROM public.profiles WHERE id = 'a1000000-0000-0000-0000-000000000002';

INSERT INTO public.cells(id, tenant_id, name, sequence, capacity_hours_per_day, wip_limit)
VALUES ('a2000000-0000-0000-0000-000000000001', current_setting('test.tenant')::uuid, 'Schedule cell', 1, 8, 5);
INSERT INTO public.jobs(id, tenant_id, job_number)
VALUES ('a3000000-0000-0000-0000-000000000001', current_setting('test.tenant')::uuid, 'SCHEDULE');
INSERT INTO public.parts(id, tenant_id, job_id, part_number, material)
VALUES ('a4000000-0000-0000-0000-000000000001', current_setting('test.tenant')::uuid, 'a3000000-0000-0000-0000-000000000001', 'SCHEDULE-PART', 'steel');
INSERT INTO public.operations(id, tenant_id, part_id, cell_id, operation_name, sequence, estimated_time)
VALUES ('a5000000-0000-0000-0000-000000000001', current_setting('test.tenant')::uuid, 'a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Schedule operation', 1, 120);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"a1000000-0000-0000-0000-000000000001"}', true);

SELECT public.apply_schedule_plan(
  current_setting('test.tenant')::uuid,
  jsonb_build_array(jsonb_build_object(
    'id', 'a5000000-0000-0000-0000-000000000001',
    'planned_start', '2026-09-21T00:00:00Z',
    'planned_end', '2026-09-21T23:59:59Z',
    'expected_updated_at', (SELECT updated_at FROM public.operations WHERE id = 'a5000000-0000-0000-0000-000000000001')
  )),
  jsonb_build_array(jsonb_build_object(
    'operation_id', 'a5000000-0000-0000-0000-000000000001',
    'cell_id', 'a2000000-0000-0000-0000-000000000001',
    'date', '2026-09-21',
    'hours_allocated', 2,
    'start_time', '07:00:00',
    'end_time', '09:00:00'
  ))
);

SELECT pg_temp.assert_true(
  (SELECT planned_start = '2026-09-21T00:00:00Z'::timestamptz FROM public.operations WHERE id = 'a5000000-0000-0000-0000-000000000001'),
  'atomic schedule updates the operation'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 AND sum(hours_allocated) = 2 FROM public.operation_day_allocations WHERE operation_id = 'a5000000-0000-0000-0000-000000000001'),
  'atomic schedule replaces allocations'
);
SELECT pg_temp.assert_true(
  jsonb_array_length(public.get_all_cell_qrm_metrics(current_setting('test.tenant')::uuid)) = 1,
  'all-cell metrics returns one row per active cell'
);

SELECT public.report_client_error('SchedulerTest', 'test_error', '40001', '/admin/capacity');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.activity_log
   WHERE tenant_id = current_setting('test.tenant')::uuid
     AND action = 'client.error'
     AND metadata->>'error_code' = '40001'),
  'client errors are recorded as bounded metadata'
);

SELECT pg_temp.expect_error(format(
  'SELECT public.apply_schedule_plan(%L::uuid, %L::jsonb, %L::jsonb)',
  current_setting('test.tenant'),
  jsonb_build_array(jsonb_build_object(
    'id', 'a5000000-0000-0000-0000-000000000001',
    'planned_start', '2026-09-22T00:00:00Z',
    'planned_end', '2026-09-22T23:59:59Z',
    'expected_updated_at', '2000-01-01T00:00:00Z'
  )),
  '[]'::jsonb
), '40001');

UPDATE public.operations
SET estimated_time = 540
WHERE id = 'a5000000-0000-0000-0000-000000000001';

SELECT pg_temp.expect_error(format(
  'SELECT public.apply_schedule_plan(%L::uuid, %L::jsonb, %L::jsonb)',
  current_setting('test.tenant'),
  jsonb_build_array(jsonb_build_object(
    'id', 'a5000000-0000-0000-0000-000000000001',
    'planned_start', '2026-09-21T00:00:00Z',
    'planned_end', '2026-09-21T23:59:59Z',
    'expected_updated_at', (SELECT updated_at FROM public.operations WHERE id = 'a5000000-0000-0000-0000-000000000001')
  )),
  jsonb_build_array(jsonb_build_object(
    'operation_id', 'a5000000-0000-0000-0000-000000000001',
    'cell_id', 'a2000000-0000-0000-0000-000000000001',
    'date', '2026-09-21',
    'hours_allocated', 9,
    'start_time', '07:00:00',
    'end_time', '16:00:00'
  ))
), '40001');

SELECT pg_temp.expect_error(format(
  'SELECT public.apply_schedule_plan(%L::uuid, %L::jsonb, %L::jsonb)',
  current_setting('test.other_tenant'),
  '[]'::jsonb,
  '[]'::jsonb
), '42501');

SELECT pg_temp.assert_true(
  (SELECT planned_start = '2026-09-21T00:00:00Z'::timestamptz FROM public.operations WHERE id = 'a5000000-0000-0000-0000-000000000001'),
  'failed schedule attempts leave the committed plan intact'
);

RESET ROLE;
ROLLBACK;
