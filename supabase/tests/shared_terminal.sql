-- Shared authenticated operator account with a separately verified PIN employee.
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

UPDATE public.profiles SET role='operator' WHERE id='d1000000-0000-0000-0000-000000000001';
UPDATE public.user_roles SET role='operator' WHERE user_id='d1000000-0000-0000-0000-000000000001';
UPDATE public.operations SET assigned_operator_id='d1000000-0000-0000-0000-000000000001' WHERE tenant_id=current_setting('test.tenant')::uuid;
INSERT INTO public.operators(id,tenant_id,employee_id,full_name,pin_hash,active) VALUES
 ('f1000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'PIN-A','Verified Worker',extensions.crypt('7890',extensions.gen_salt('bf')),true),
 ('f1000000-0000-0000-0000-000000000002',current_setting('test.tenant')::uuid,'PIN-B','Other Worker',extensions.crypt('4321',extensions.gen_salt('bf')),true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001","session_id":"d9000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''start'',''f1000000-0000-0000-0000-000000000001'')',current_setting('test.tenant')),'42501');
-- The terminal's own profile and NULL actor must not bypass employee verification.
SELECT pg_temp.expect_error('UPDATE public.operations SET status=''in_progress'' WHERE id=''d5000000-0000-0000-0000-000000000002''','42501');
SELECT pg_temp.expect_error('UPDATE public.operation_batches SET status=''completed'' WHERE id=''d6000000-0000-0000-0000-000000000001''','42501');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''start'',auth.uid())',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''complete'')',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('SELECT transition_batch(%L::uuid,''d6000000-0000-0000-0000-000000000001'',''start'',auth.uid())',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('INSERT INTO time_entries(tenant_id,operation_id,operator_id) VALUES(%L::uuid,''d5000000-0000-0000-0000-000000000001'',auth.uid())',current_setting('test.tenant')),'42501');
SELECT pg_temp.assert_true((SELECT NOT success FROM public.verify_operator_pin('PIN-A','wrong')),'wrong PIN does not authorize operator');
SELECT pg_temp.assert_true((SELECT success FROM public.verify_operator_pin('PIN-A','7890')),'correct PIN establishes session binding');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''start'',auth.uid())',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000001'',''start'',''f1000000-0000-0000-0000-000000000002'')',current_setting('test.tenant')),'42501');
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000001','start','f1000000-0000-0000-0000-000000000001');
SELECT pg_temp.assert_true((SELECT operator_id=auth.uid() AND shop_floor_operator_id='f1000000-0000-0000-0000-000000000001' FROM public.time_entries WHERE operation_id='d5000000-0000-0000-0000-000000000001'),'timer preserves both terminal account and verified employee');
SELECT set_config('test.timer',(SELECT id::text FROM public.time_entries WHERE operation_id='d5000000-0000-0000-0000-000000000001'),true);
SELECT time_entry_action(current_setting('test.tenant')::uuid,current_setting('test.timer')::uuid,'pause');
SELECT time_entry_action(current_setting('test.tenant')::uuid,current_setting('test.timer')::uuid,'resume');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001","session_id":"d9000000-0000-0000-0000-000000000002"}',true);
SELECT pg_temp.expect_error(format('SELECT time_entry_action(%L::uuid,%L::uuid,''stop'')',current_setting('test.tenant'),current_setting('test.timer')),'42501');
SELECT pg_temp.expect_error(format('UPDATE public.time_entries SET notes=''forged'' WHERE id=%L::uuid',current_setting('test.timer')),'42501');
SELECT pg_temp.expect_error(format('INSERT INTO public.time_entry_pauses(time_entry_id) VALUES(%L::uuid)',current_setting('test.timer')),'42501');
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001","session_id":"d9000000-0000-0000-0000-000000000001"}',true);
SELECT time_entry_action(current_setting('test.tenant')::uuid,current_setting('test.timer')::uuid,'stop');
SELECT pg_temp.assert_true((SELECT end_time IS NOT NULL FROM public.time_entries WHERE id=current_setting('test.timer')::uuid),'verified session can stop timer');
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000001','complete');
SELECT public.clear_operator_session();
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''start'',''f1000000-0000-0000-0000-000000000001'')',current_setting('test.tenant')),'42501');
SELECT pg_temp.assert_true((SELECT success FROM public.verify_operator_pin('PIN-A','7890')),'operator can verify again after locking');
SELECT transition_batch(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001','start','f1000000-0000-0000-0000-000000000001');
RESET ROLE;
UPDATE public.operator_sessions SET expires_at=now()-interval '1 second' WHERE user_id='d1000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''start'',''f1000000-0000-0000-0000-000000000001'')',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''start'',auth.uid())',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('SELECT transition_operation(%L::uuid,''d5000000-0000-0000-0000-000000000002'',''complete'')',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('SELECT transition_batch(%L::uuid,''d6000000-0000-0000-0000-000000000001'',''stop'',''f1000000-0000-0000-0000-000000000001'')',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error(format('UPDATE public.time_entries SET notes=''expired'' WHERE id=%L::uuid',current_setting('test.timer')),'42501');
SELECT pg_temp.expect_error(format('INSERT INTO time_entries(tenant_id,operation_id,operator_id) VALUES(%L::uuid,''d5000000-0000-0000-0000-000000000002'',auth.uid())',current_setting('test.tenant')),'42501');
SELECT pg_temp.expect_error('UPDATE public.operations SET status=''in_progress'' WHERE id=''d5000000-0000-0000-0000-000000000002''','42501');
SELECT pg_temp.expect_error('UPDATE public.operation_batches SET status=''completed'' WHERE id=''d6000000-0000-0000-0000-000000000001''','42501');
SELECT pg_temp.assert_true((SELECT success FROM public.verify_operator_pin('PIN-A','7890')),'expired operator can verify again');
SELECT transition_batch(current_setting('test.tenant')::uuid,'d6000000-0000-0000-0000-000000000001','stop','f1000000-0000-0000-0000-000000000001');
RESET ROLE;

-- API keys use a trusted service role, without a browser employee session.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','start');
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','pause');
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','start','d1000000-0000-0000-0000-000000000001');
SELECT pg_temp.assert_true((SELECT operator_id='d1000000-0000-0000-0000-000000000001' AND shop_floor_operator_id IS NULL FROM public.time_entries WHERE operation_id='d5000000-0000-0000-0000-000000000002'),'service API retains explicit profile attribution');
SELECT transition_operation(current_setting('test.tenant')::uuid,'d5000000-0000-0000-0000-000000000002','finish','d1000000-0000-0000-0000-000000000001');
RESET ROLE;
ROLLBACK;
