-- Rollback-only integration tests for the same RPCs called by browser and API.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,expected_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=expected_state THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected %, got %: %',expected_state,SQLSTATE,SQLERRM;
  END;
  RAISE EXCEPTION 'Expected % but statement succeeded',expected_state;
END $$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('d1000000-0000-0000-0000-000000000001','production@example.invalid','{"username":"production","full_name":"Production Operator"}'),
 ('e1000000-0000-0000-0000-000000000001','other-production@example.invalid','{"username":"other-production","full_name":"Other Operator"}');
SELECT set_config('test.tenant',tenant_id::text,true) FROM profiles WHERE id='d1000000-0000-0000-0000-000000000001';
INSERT INTO cells(id,tenant_id,name,sequence) VALUES('d2000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'Test cell',1);
INSERT INTO jobs(id,tenant_id,job_number) VALUES
 ('d3000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'LIFECYCLE'),
 ('d3000000-0000-0000-0000-000000000002',current_setting('test.tenant')::uuid,'BATCH');
INSERT INTO parts(id,tenant_id,job_id,part_number,material) VALUES
 ('d4000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'d3000000-0000-0000-0000-000000000001','PART','steel'),
 ('d4000000-0000-0000-0000-000000000002',current_setting('test.tenant')::uuid,'d3000000-0000-0000-0000-000000000002','BATCH-PART','steel');
INSERT INTO operations(id,tenant_id,part_id,cell_id,operation_name,sequence,estimated_time)
SELECT ('d5000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,current_setting('test.tenant')::uuid,
 CASE WHEN n<=2 THEN 'd4000000-0000-0000-0000-000000000001'::uuid ELSE 'd4000000-0000-0000-0000-000000000002'::uuid END,
 'd2000000-0000-0000-0000-000000000001','Operation '||n,n,1 FROM generate_series(1,5) n;
INSERT INTO operation_batches(id,tenant_id,cell_id,batch_number) VALUES
 ('d6000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'d2000000-0000-0000-0000-000000000001','BATCH-TEST');
INSERT INTO batch_operations(tenant_id,batch_id,operation_id)
SELECT current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001',id FROM operations WHERE operation_name IN ('Operation 3','Operation 4','Operation 5') AND tenant_id=current_setting('test.tenant')::uuid;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.assert_true((add_batch_operations(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001',ARRAY['d5000000-0000-0000-0000-000000000003'::uuid])->>'operations_added')::integer=0,'repeated batch membership assignment is idempotent');
SELECT pg_temp.assert_true((transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000001','start',auth.uid())->>'changed')::boolean,'first start changes state');
SELECT pg_temp.assert_true(NOT (transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000001','start',auth.uid())->>'changed')::boolean,'repeated start is idempotent');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM time_entries WHERE operator_id=auth.uid() AND end_time IS NULL),'one active timer after repeated start');
SELECT switch_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000002',auth.uid());
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM time_entries WHERE operator_id=auth.uid() AND end_time IS NULL AND operation_id='d5000000-0000-0000-0000-000000000002'),'switch closes the source timer and starts the target timer atomically');
SELECT switch_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','d5000000-0000-0000-0000-000000000001',auth.uid());
RESET ROLE;
UPDATE operations SET status='not_started',started_at=NULL WHERE id='d5000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''start'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''complete'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''resume'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''pause'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''complete'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.expect_error(format('SELECT dispatch_webhook(%L::uuid,''forged.event'',''{}''::jsonb)',current_setting('test.tenant')),'42501');
SELECT pg_temp.assert_true((SELECT status='in_progress' AND current_cell_id='d2000000-0000-0000-0000-000000000001' FROM jobs WHERE id='d3000000-0000-0000-0000-000000000001'),'start propagates job state and location');
SELECT set_config('test.timer',(SELECT id::text FROM time_entries WHERE operator_id=auth.uid() AND end_time IS NULL),true);
SELECT time_entry_action(current_setting('test.tenant')::uuid,current_setting('test.timer')::uuid,'pause');
SELECT pg_temp.assert_true(NOT (time_entry_action(current_setting('test.tenant')::uuid,current_setting('test.timer')::uuid,'pause')->>'changed')::boolean,'repeated pause does not add another pause');
UPDATE time_entries SET start_time=now()-interval '10 minutes' WHERE id=current_setting('test.timer')::uuid;
UPDATE time_entry_pauses SET paused_at=now()-interval '2 minutes' WHERE time_entry_id=current_setting('test.timer')::uuid;
SELECT time_entry_action(current_setting('test.tenant')::uuid,current_setting('test.timer')::uuid,'stop');
SELECT pg_temp.assert_true((SELECT duration=8 AND end_time IS NOT NULL AND NOT is_paused FROM time_entries WHERE id=current_setting('test.timer')::uuid),'stopping closes pause and subtracts seconds before rounding minutes');
SELECT pg_temp.assert_true((SELECT actual_time=8 FROM operations WHERE id='d5000000-0000-0000-0000-000000000001'),'operation actual time matches closed timer');
RESET ROLE;
UPDATE tenants SET feature_flags=COALESCE(feature_flags,'{}'::jsonb)||'{"sequentialRelease":true}' WHERE id=current_setting('test.tenant')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''start'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''finish'',auth.uid())',current_setting('test.tenant')),'22023');
SELECT pg_temp.assert_true((SELECT status='not_started' FROM operations WHERE id='d5000000-0000-0000-0000-000000000002'),'sequential release blocks the next operation while the previous one is open');
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000001','complete',auth.uid());
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','start',auth.uid());
SELECT pg_temp.assert_true((SELECT status='in_progress' FROM operations WHERE id='d5000000-0000-0000-0000-000000000002'),'sequential release lets the next operation start once the previous one is completed');
RESET ROLE;
UPDATE tenants SET feature_flags=feature_flags-'sequentialRelease' WHERE id=current_setting('test.tenant')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001"}',true);
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','finish',auth.uid());
SELECT pg_temp.assert_true((SELECT status='completed' AND current_cell_id IS NULL FROM jobs WHERE id='d3000000-0000-0000-0000-000000000001'),'last operation completes job atomically');
SELECT pg_temp.assert_true(NOT (transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','complete',auth.uid())->>'changed')::boolean,'repeated completion is idempotent');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''start'',auth.uid())',current_setting('test.tenant')),'22023');
RESET ROLE;

-- Inject a failure after timer inserts, proving all writes roll back together.
CREATE FUNCTION pg_temp.reject_batch_start() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('test.reject_batch',true)='true' AND NEW.id='d5000000-0000-0000-0000-000000000005' THEN
   RAISE EXCEPTION 'Injected operation update failure';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER test_reject_batch BEFORE UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_batch_start();
SET LOCAL ROLE authenticated;
SELECT set_config('test.reject_batch','true',true);
SELECT pg_temp.expect_error(format('SELECT transition_batch(%L::uuid,''d6000000-0000-0000-0000-000000000001'',''start'',auth.uid())',current_setting('test.tenant')),'P0001');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM time_entries WHERE end_time IS NULL AND tenant_id=public.get_user_tenant_id()),'failed batch start leaves no timers');
SELECT pg_temp.assert_true((SELECT status='draft' FROM operation_batches WHERE id='d6000000-0000-0000-0000-000000000001'),'failed batch start retains draft state');
SELECT set_config('test.reject_batch','false',true);
SELECT transition_batch(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001','start',auth.uid());
SELECT pg_temp.assert_true(NOT (transition_batch(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001','start',auth.uid())->>'changed')::boolean,'repeated batch start is idempotent');
SELECT pg_temp.assert_true((SELECT count(*)=3 FROM time_entries WHERE end_time IS NULL AND operator_id=auth.uid()),'batch creates exactly one timer per operation');
SELECT pg_temp.assert_true((SELECT bool_and(notes='batch:d6000000-0000-0000-0000-000000000001') FROM time_entries WHERE end_time IS NULL AND tenant_id=public.get_user_tenant_id()),'batch timer notes retain UI grouping contract');
SELECT pg_temp.expect_error(format('SELECT add_batch_operations(%L::uuid,''d6000000-0000-0000-0000-000000000001'',ARRAY[''d5000000-0000-0000-0000-000000000001''::uuid])',current_setting('test.tenant')),'22023');
UPDATE operation_batches SET started_at=now()-interval '2 minutes' WHERE id='d6000000-0000-0000-0000-000000000001';
UPDATE time_entries SET start_time=now()-interval '2 minutes' WHERE end_time IS NULL AND tenant_id=public.get_user_tenant_id();
SELECT transition_batch(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001','stop',auth.uid());
SELECT pg_temp.assert_true((SELECT sum(actual_time)=2 AND min(actual_time)>=0 FROM operations WHERE part_id='d4000000-0000-0000-0000-000000000002'),'weighted rounding preserves nonnegative exact total');
SELECT pg_temp.assert_true((SELECT status='completed' FROM jobs WHERE id='d3000000-0000-0000-0000-000000000002'),'batch completion propagates job state');
SELECT pg_temp.assert_true(NOT (transition_batch(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001','stop',auth.uid())->>'changed')::boolean,'repeated batch stop does not count time twice');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"e1000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''complete'',auth.uid())',current_setting('test.tenant')),'42501');
RESET ROLE;
ROLLBACK;
