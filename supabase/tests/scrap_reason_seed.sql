-- Rollback-only seed, idempotence, authorization and category regression.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',message; END IF; END $$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f4000000-0000-0000-0000-000000000001','scrap-seed@example.invalid','{"username":"scrap-seed","full_name":"Scrap Seed"}');
SELECT set_config('test.tenant',tenant_id::text,true) FROM profiles WHERE id='f4000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f4000000-0000-0000-0000-000000000001"}',true);
SELECT pg_temp.assert_true((SELECT inserted_count=31 FROM seed_default_scrap_reasons(current_setting('test.tenant')::uuid)), 'creates all 31 defaults');
SELECT pg_temp.assert_true((SELECT bool_and(category IN ('material','process','equipment','operator','design','other')) FROM scrap_reasons WHERE tenant_id=current_setting('test.tenant')::uuid), 'categories meet constraint');
SELECT pg_temp.assert_true((SELECT inserted_count=0 FROM seed_default_scrap_reasons(current_setting('test.tenant')::uuid)), 'seed is idempotent');
SELECT pg_temp.assert_true(NOT has_function_privilege('anon','public.seed_default_scrap_reasons(uuid)','EXECUTE'), 'anonymous callers remain forbidden');
RESET ROLE;
ROLLBACK;
