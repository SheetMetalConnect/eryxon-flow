-- Execute against a disposable local database with psql -v ON_ERROR_STOP=1.
-- Every fixture and mutation is rolled back, including auth users and objects.
BEGIN;
SET LOCAL storage.allow_delete_query = 'true';
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF;
END $$;
CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected %, got %: %', expected_state, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'Expected % but statement succeeded', expected_state;
END $$;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('a1000000-0000-0000-0000-000000000001','boundary-a@example.invalid','{"username":"boundary-a","full_name":"Boundary A"}'),
 ('b1000000-0000-0000-0000-000000000001','boundary-b@example.invalid','{"username":"boundary-b","full_name":"Boundary B"}');
SELECT set_config('test.tenant_a',tenant_id::text,true) FROM profiles WHERE id='a1000000-0000-0000-0000-000000000001';
SELECT set_config('test.tenant_b',tenant_id::text,true) FROM profiles WHERE id='b1000000-0000-0000-0000-000000000001';
INSERT INTO jobs (id,tenant_id,job_number) VALUES
 ('a2000000-0000-0000-0000-000000000001',current_setting('test.tenant_a')::uuid,'BOUNDARY-A'),
 ('b2000000-0000-0000-0000-000000000001',current_setting('test.tenant_b')::uuid,'BOUNDARY-B');
INSERT INTO storage.objects (bucket_id,name,metadata) VALUES
 ('parts-cad',current_setting('test.tenant_a')||'/drawing.step','{"size":100}'),
 ('parts-cad',current_setting('test.tenant_b')||'/drawing.step','{"size":200}');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT pg_temp.expect_error(format('SELECT public.seed_demo_operators(%L::uuid)',current_setting('test.tenant_a')),'42501');
SELECT pg_temp.expect_error('SELECT public.reset_monthly_parts_counters()','42501');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"a1000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.assert_true(public.has_role(auth.uid(),'admin'),'fixture is an ordinary tenant admin');
SELECT pg_temp.expect_error('UPDATE profiles SET is_root_admin=true WHERE id=auth.uid()','42501');
SELECT pg_temp.expect_error(format('UPDATE profiles SET active_tenant_id=%L::uuid WHERE id=auth.uid()',current_setting('test.tenant_b')),'42501');
SELECT pg_temp.expect_error(format('SELECT public.set_active_tenant(%L::uuid)',current_setting('test.tenant_b')),'P0001');
SELECT pg_temp.expect_error('UPDATE tenants SET plan=''enterprise'' WHERE id=public.get_user_tenant_id()','42501');
SELECT pg_temp.expect_error('UPDATE tenants SET max_parts_per_month=NULL WHERE id=public.get_user_tenant_id()','42501');
UPDATE tenants SET company_name='Updated name' WHERE id=public.get_user_tenant_id();
SELECT pg_temp.assert_true((SELECT company_name='Updated name' FROM tenants WHERE id=public.get_user_tenant_id()),'ordinary company settings remain editable');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM user_roles WHERE user_id='b1000000-0000-0000-0000-000000000001'),'other tenant roles are invisible');
SELECT pg_temp.expect_error('INSERT INTO user_roles(user_id,role) VALUES(''b1000000-0000-0000-0000-000000000001'',''operator'')','42501');
SELECT pg_temp.expect_error(format('SELECT public.seed_demo_operators(%L::uuid)',current_setting('test.tenant_b')),'42501');
SELECT * FROM public.seed_demo_operators(current_setting('test.tenant_a')::uuid);
SELECT pg_temp.assert_true((SELECT count(*)=4 FROM operators WHERE tenant_id=public.get_user_tenant_id()),'own-tenant demo seeding still works');
SELECT pg_temp.expect_error(format('SELECT public.create_invitation(''invited@example.invalid'',''admin'',%L::uuid)',current_setting('test.tenant_b')),'42501');

SELECT pg_temp.assert_true((SELECT count(*)=1 FROM storage.objects WHERE bucket_id='parts-cad'),'private storage list is tenant scoped');
SELECT pg_temp.expect_error(format('INSERT INTO storage.objects(bucket_id,name) VALUES(''parts-cad'',%L)',current_setting('test.tenant_b')||'/foreign.step'),'42501');
DELETE FROM storage.objects WHERE bucket_id='parts-cad' AND name=current_setting('test.tenant_b')||'/drawing.step';
SELECT public.update_tenant_storage_usage(current_setting('test.tenant_a')::uuid,999999999,'set');
SELECT pg_temp.assert_true((SELECT current_storage_gb < 0.001 FROM tenants WHERE id=public.get_user_tenant_id()),'browser cannot supply an arbitrary storage usage total');
SELECT pg_temp.expect_error(format('SELECT public.update_tenant_storage_usage(%L::uuid,0,''set'')',current_setting('test.tenant_b')),'42501');

SELECT pg_temp.expect_error(format('INSERT INTO parts(tenant_id,job_id,part_number,quantity,material) VALUES(%L::uuid,''b2000000-0000-0000-0000-000000000001'',''foreign'',1,''steel'')',current_setting('test.tenant_a')),'23503');
INSERT INTO parts(tenant_id,job_id,part_number,quantity,material) VALUES(public.get_user_tenant_id(),'a2000000-0000-0000-0000-000000000001','own',1,'steel');
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM storage.objects WHERE name=current_setting('test.tenant_b')||'/drawing.step'),'cross-tenant delete did not remove object');

-- Public signup cannot choose arbitrary tenant membership or a more powerful role.
SELECT pg_temp.expect_error(format('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(''c1000000-0000-0000-0000-000000000001'',''intruder@example.invalid'',%L::jsonb)',jsonb_build_object('tenant_id',current_setting('test.tenant_b'),'role','admin')::text),'42501');
INSERT INTO invitations(tenant_id,email,role,token,invited_by)
VALUES(current_setting('test.tenant_a')::uuid,'invited@example.invalid','operator','boundary-test-token','a1000000-0000-0000-0000-000000000001');
INSERT INTO auth.users(id,email,raw_user_meta_data)
VALUES('c1000000-0000-0000-0000-000000000001','invited@example.invalid',jsonb_build_object('tenant_id',current_setting('test.tenant_a'),'invitation_token','boundary-test-token','role','admin'));
SELECT pg_temp.assert_true((SELECT role='operator' FROM profiles WHERE id='c1000000-0000-0000-0000-000000000001'),'invitation role overrides untrusted signup metadata');
SELECT pg_temp.assert_true(public.accept_invitation('boundary-test-token','c1000000-0000-0000-0000-000000000001'),'accepted invitation acknowledgement is idempotent');
SELECT pg_temp.assert_true((SELECT status='accepted' FROM invitations WHERE token='boundary-test-token'),'signup consumes invitation atomically');

-- Service-role integrations are also subject to the relationship invariant.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT pg_temp.expect_error(format('INSERT INTO parts(tenant_id,job_id,part_number,quantity,material) VALUES(%L::uuid,''b2000000-0000-0000-0000-000000000001'',''foreign-api'',1,''steel'')',current_setting('test.tenant_a')),'23503');
RESET ROLE;
ROLLBACK;
