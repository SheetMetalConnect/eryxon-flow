-- Rollback-only: event catalogue, trigger gating, delivery isolation, admin RPC guards.
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

-- Event names follow the status transition, not the table operation.
SELECT pg_temp.assert_true(webhook_event_name('job','INSERT',NULL,'not_started')='job.created','insert is created');
SELECT pg_temp.assert_true(webhook_event_name('production','INSERT',NULL,NULL)='production.reported','quantities are reported');
SELECT pg_temp.assert_true(webhook_event_name('operation','UPDATE','not_started','in_progress')='operation.started','start');
SELECT pg_temp.assert_true(webhook_event_name('operation','UPDATE','in_progress','on_hold')='operation.paused','pause');
SELECT pg_temp.assert_true(webhook_event_name('operation','UPDATE','on_hold','in_progress')='operation.resumed','resume');
SELECT pg_temp.assert_true(webhook_event_name('operation','UPDATE','in_progress','completed')='operation.completed','complete');
SELECT pg_temp.assert_true(webhook_event_name('operation','UPDATE','in_progress','in_progress')='operation.updated','same status is updated');
SELECT pg_temp.assert_true(webhook_event_name('issue','UPDATE','pending','closed')='issue.resolved','closing an issue resolves it');
SELECT pg_temp.assert_true(webhook_event_name('batch','DELETE','draft',NULL)='batch.deleted','delete');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f1000000-0000-0000-0000-000000000001','webhook-admin@example.invalid','{"username":"webhook-admin","full_name":"Webhook Admin"}'),
 ('f1000000-0000-0000-0000-000000000002','webhook-other@example.invalid','{"username":"webhook-other","full_name":"Other Admin"}');
SELECT set_config('test.tenant',tenant_id::text,true) FROM profiles WHERE id='f1000000-0000-0000-0000-000000000001';
SELECT set_config('test.other',tenant_id::text,true) FROM profiles WHERE id='f1000000-0000-0000-0000-000000000002';
INSERT INTO webhooks(id,tenant_id,name,url,events,secret_key) VALUES
 ('f2000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'erp','https://erp.example.invalid/hook',ARRAY['job.created'],'secret');
SELECT pg_temp.expect_error(format('INSERT INTO webhooks(tenant_id,name,url,events,secret_key) VALUES(%L,''plain'',''http://erp.example.invalid'',ARRAY[''job.created''],''s'')',current_setting('test.tenant')),'23514');
INSERT INTO webhook_deliveries(tenant_id,webhook_id,event_id,event,payload,status,status_code) VALUES
 (current_setting('test.tenant')::uuid,'f2000000-0000-0000-0000-000000000001',gen_random_uuid(),'job.created','{"data":{}}','delivered',200);

-- Trigger fires only for subscribed events (dispatch_webhook warns without vault secrets, never raises).
INSERT INTO jobs(id,tenant_id,job_number) VALUES('f3000000-0000-0000-0000-000000000001',current_setting('test.tenant')::uuid,'WH-1');
UPDATE jobs SET status='in_progress' WHERE id='f3000000-0000-0000-0000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM webhook_deliveries),'admin sees own deliveries');
SELECT webhook_send_test('f2000000-0000-0000-0000-000000000001');
SELECT webhook_redeliver((SELECT id FROM webhook_deliveries LIMIT 1));
SELECT pg_temp.expect_error('SELECT webhook_send_test(''f2000000-0000-0000-0000-0000000000ff'')','P0002');
SELECT pg_temp.expect_error(format('INSERT INTO webhook_deliveries(tenant_id,webhook_id,event_id,event,payload,status) VALUES(%L,''f2000000-0000-0000-0000-000000000001'',gen_random_uuid(),''x'',''{}'',''delivered'')',current_setting('test.tenant')),'42501');

SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f1000000-0000-0000-0000-000000000002"}',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM webhook_deliveries),'other tenant sees no deliveries');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM webhooks WHERE id='f2000000-0000-0000-0000-000000000001'),'other tenant sees no endpoints');
SELECT pg_temp.expect_error('SELECT webhook_send_test(''f2000000-0000-0000-0000-000000000001'')','42501');
RESET ROLE;
ROLLBACK;
