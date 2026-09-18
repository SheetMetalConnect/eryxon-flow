-- Supabase performance advisor: auth_rls_initplan and duplicate_index.
-- auth.uid()/jwt()/role() inside a policy is evaluated per row; wrapping it in
-- a scalar subquery turns it into one InitPlan per statement.
DO $$
DECLARE
  p record;
  new_qual text;
  new_check text;
  pattern constant text := '\mauth\.(uid|jwt|role)\(\)';
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND (qual ~ pattern OR with_check ~ pattern)
  LOOP
    new_qual := regexp_replace(p.qual, pattern, '(select auth.\1())', 'g');
    new_check := regexp_replace(p.with_check, pattern, '(select auth.\1())', 'g');
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s %s %s',
      p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
      array_to_string(p.roles, ', '),
      CASE WHEN new_qual IS NOT NULL THEN 'USING (' || new_qual || ')' ELSE '' END,
      CASE WHEN new_check IS NOT NULL THEN 'WITH CHECK (' || new_check || ')' ELSE '' END);
  END LOOP;

  -- Legacy idx_tasks_* duplicates of idx_operations_* (same definition).
  FOR p IN
    SELECT a.indexname
    FROM pg_indexes a JOIN pg_indexes b
      ON b.schemaname = a.schemaname AND b.tablename = a.tablename
     AND regexp_replace(b.indexdef, '^CREATE (UNIQUE )?INDEX \S+ ON ', '') = regexp_replace(a.indexdef, '^CREATE (UNIQUE )?INDEX \S+ ON ', '')
    WHERE a.schemaname = 'public' AND a.tablename = 'operations'
      AND a.indexname LIKE 'idx\_tasks\_%' AND b.indexname LIKE 'idx\_operations\_%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', p.indexname);
  END LOOP;
END $$;
