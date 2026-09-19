BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF; END $$;
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
  ('a1100000-0000-0000-0000-000000000001', 'mcp-a@example.invalid', '{"username":"mcp-a","full_name":"MCP A"}'),
  ('b1100000-0000-0000-0000-000000000001', 'mcp-b@example.invalid', '{"username":"mcp-b","full_name":"MCP B"}');
SELECT set_config('test.tenant_a', tenant_id::text, true) FROM public.profiles WHERE id = 'a1100000-0000-0000-0000-000000000001';
SELECT set_config('test.tenant_b', tenant_id::text, true) FROM public.profiles WHERE id = 'b1100000-0000-0000-0000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"a1100000-0000-0000-0000-000000000001"}', true);
SELECT pg_temp.expect_error(
  format('SELECT public.create_operator_with_pin(%L::uuid,''MCP-BAD'',''Wrong tenant'',''1234'')', current_setting('test.tenant_b')),
  '42501'
);
SELECT set_config(
  'test.operator',
  public.create_operator_with_pin(current_setting('test.tenant_a')::uuid, 'MCP-001', 'MCP Operator', '1234')::text,
  true
);
SELECT pg_temp.assert_true(
  (SELECT tenant_id = current_setting('test.tenant_a')::uuid FROM public.operators WHERE id = current_setting('test.operator')::uuid),
  'operator is created in the authenticated tenant'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT pg_temp.assert_true(
  public.reset_operator_pin(current_setting('test.tenant_a')::uuid, current_setting('test.operator')::uuid, '5678'),
  'service integration can reset a PIN inside its explicit tenant'
);
SELECT pg_temp.expect_error(
  format('SELECT public.unlock_operator(%L::uuid,%L::uuid)', current_setting('test.tenant_b'), current_setting('test.operator')),
  'P0002'
);
RESET ROLE;
ROLLBACK;
