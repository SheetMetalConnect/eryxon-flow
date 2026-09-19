BEGIN;

CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF;
END $$;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'demo-consistency@example.invalid',
  '{"username":"demo-consistency","full_name":"Demo Consistency"}'
);

SELECT set_config('test.tenant_id', tenant_id::text, true)
FROM public.profiles
WHERE id = 'd1000000-0000-0000-0000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001"}',
  true
);

INSERT INTO public.cells (id, tenant_id, name, sequence)
VALUES (
  'd2000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'Demo cell',
  10
);

INSERT INTO public.jobs (id, tenant_id, job_number, due_date)
VALUES (
  'd3000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'DEMO-CONSISTENCY',
  now() + interval '14 days'
);

INSERT INTO public.parts (id, tenant_id, job_id, part_number, material, quantity)
VALUES (
  'd4000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd3000000-0000-0000-0000-000000000001',
  'DEMO-PART',
  'Steel',
  1
);

INSERT INTO public.operations (
  id,
  tenant_id,
  part_id,
  cell_id,
  operation_name,
  sequence,
  estimated_time,
  status,
  planned_start,
  planned_end
) VALUES (
  'd5000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd4000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'Demo operation',
  10,
  60,
  'not_started',
  now() + interval '1 day',
  now() + interval '2 days'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.expectations
   WHERE entity_id = 'd5000000-0000-0000-0000-000000000001'
     AND superseded_by IS NULL),
  'operation insert creates one active expectation'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.get_part_routing('d4000000-0000-0000-0000-000000000001')
   WHERE status = 'not_started'),
  'part routing returns task status as text'
);

UPDATE public.operations
SET planned_end = planned_end
WHERE id = 'd5000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.expectations
   WHERE entity_id = 'd5000000-0000-0000-0000-000000000001'),
  'unchanged planning is idempotent'
);

UPDATE public.operations
SET planned_end = planned_end + interval '1 day'
WHERE id = 'd5000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.expectations
   WHERE entity_id = 'd5000000-0000-0000-0000-000000000001'),
  'replanning preserves expectation history'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.expectations
   WHERE entity_id = 'd5000000-0000-0000-0000-000000000001'
     AND version = 2
     AND superseded_by IS NULL),
  'replanning leaves one active expectation at version two'
);

UPDATE public.operations
SET planned_end = NULL
WHERE id = 'd5000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.expectations
   WHERE entity_id = 'd5000000-0000-0000-0000-000000000001'
     AND version = 3
     AND expected_at IS NULL
     AND superseded_by IS NULL),
  'clearing a plan versions the expectation without an active deadline'
);

RESET ROLE;

INSERT INTO public.assignments (
  id, tenant_id, job_id, part_id, assigned_by, operator_id
) VALUES (
  'd6000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd3000000-0000-0000-0000-000000000001',
  'd4000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001'
);

INSERT INTO public.operation_day_allocations (
  tenant_id, operation_id, cell_id, date, hours_allocated, start_time, end_time
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'd5000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  current_date + 1,
  1,
  '08:00',
  '09:00'
);

INSERT INTO public.operation_batches (
  id, tenant_id, cell_id, batch_number
) VALUES (
  'd7000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd2000000-0000-0000-0000-000000000001',
  'DEMO-BATCH'
);
INSERT INTO public.batch_requirements (
  tenant_id, batch_id, material_name
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'd7000000-0000-0000-0000-000000000001',
  'Steel'
);
INSERT INTO public.batch_operations (
  tenant_id, batch_id, operation_id
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'd7000000-0000-0000-0000-000000000001',
  'd5000000-0000-0000-0000-000000000001'
);

INSERT INTO public.scrap_reasons (
  id, tenant_id, code, description, category
) VALUES (
  'd8000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'DEMO-001',
  'Demo scrap',
  'material'
);
INSERT INTO public.operation_quantities (
  id, tenant_id, operation_id, quantity_produced, quantity_good, quantity_scrap
) VALUES (
  'd9000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd5000000-0000-0000-0000-000000000001',
  2,
  1,
  1
);
INSERT INTO public.operation_quantity_scrap_reasons (
  operation_quantity_id, scrap_reason_id, quantity
) VALUES (
  'd9000000-0000-0000-0000-000000000001',
  'd8000000-0000-0000-0000-000000000001',
  1
);

INSERT INTO public.time_entries (
  id, tenant_id, operation_id, operator_id, start_time
) VALUES (
  'da000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd5000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  now()
);
INSERT INTO public.time_entry_pauses (time_entry_id, paused_at)
VALUES ('da000000-0000-0000-0000-000000000001', now());

INSERT INTO public.substeps (
  tenant_id, operation_id, name, sequence
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'd5000000-0000-0000-0000-000000000001',
  'Demo substep',
  10
);

INSERT INTO public.storage_locations (
  id, tenant_id, cell_id, code
) VALUES (
  'db000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'd2000000-0000-0000-0000-000000000001',
  'DEMO-A1'
);
INSERT INTO public.part_placements (
  tenant_id, location_id, part_id, operation_id
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'db000000-0000-0000-0000-000000000001',
  'd4000000-0000-0000-0000-000000000001',
  'd5000000-0000-0000-0000-000000000001'
);

INSERT INTO public.resources (
  id, tenant_id, name, type
) VALUES (
  'dc000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'Demo tool',
  'tooling'
);
INSERT INTO public.resource_cell_memberships (
  tenant_id, resource_id, cell_id, assigned_by
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'dc000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001'
);
INSERT INTO public.operation_resources (operation_id, resource_id)
VALUES (
  'd5000000-0000-0000-0000-000000000001',
  'dc000000-0000-0000-0000-000000000001'
);

INSERT INTO public.materials (tenant_id, name)
VALUES (current_setting('test.tenant_id')::uuid, 'Demo material');
INSERT INTO public.substep_templates (
  id, tenant_id, name, created_by
) VALUES (
  'dd000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'Demo template',
  'd1000000-0000-0000-0000-000000000001'
);
INSERT INTO public.substep_template_items (template_id, name, sequence)
VALUES ('dd000000-0000-0000-0000-000000000001', 'Demo item', 10);

INSERT INTO public.operators (
  id, tenant_id, employee_id, full_name, pin_hash
) VALUES (
  'de000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'DEMO1',
  'Demo operator',
  'test-only-hash'
);
INSERT INTO public.operator_sessions (
  session_id, tenant_id, operator_id, user_id, expires_at
) VALUES (
  'df000000-0000-0000-0000-000000000001',
  current_setting('test.tenant_id')::uuid,
  'de000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  now() + interval '1 hour'
);
INSERT INTO public.attendance_entries (
  tenant_id, operator_id, clock_in
) VALUES (
  current_setting('test.tenant_id')::uuid,
  'de000000-0000-0000-0000-000000000001',
  now()
);
INSERT INTO public.factory_calendar (
  tenant_id, date, day_type, name, capacity_multiplier
) VALUES (
  current_setting('test.tenant_id')::uuid,
  current_date + 1,
  'working',
  'Demo day',
  1
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001"}',
  true
);

SELECT * FROM public.clear_demo_data(current_setting('test.tenant_id')::uuid);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.operations
   WHERE tenant_id = current_setting('test.tenant_id')::uuid),
  'demo reset removes operations'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.expectations
   WHERE tenant_id = current_setting('test.tenant_id')::uuid),
  'demo reset removes expectations'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.profiles
   WHERE id = 'd1000000-0000-0000-0000-000000000001'),
  'demo reset preserves the administrator profile'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.operation_batches
   WHERE tenant_id = current_setting('test.tenant_id')::uuid),
  'demo reset removes batches and requirements'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.storage_locations
   WHERE tenant_id = current_setting('test.tenant_id')::uuid),
  'demo reset removes locations and placements'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.operators
   WHERE tenant_id = current_setting('test.tenant_id')::uuid),
  'demo reset removes marked demo operators'
);

RESET ROLE;
ROLLBACK;
