-- Preserve the authenticated terminal account and the PIN-verified employee
-- as separate identities. Existing profile-based time records remain unchanged.
-- Rollback: remove new RPC callers first; retaining nullable attribution is safe.
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS shop_floor_operator_id uuid
  REFERENCES public.operators(id);
ALTER TABLE public.operation_batches
  ADD COLUMN IF NOT EXISTS started_by_shop_floor_operator_id uuid REFERENCES public.operators(id),
  ADD COLUMN IF NOT EXISTS completed_by_shop_floor_operator_id uuid REFERENCES public.operators(id);
CREATE INDEX IF NOT EXISTS time_entries_shop_floor_active_idx
  ON public.time_entries(tenant_id,shop_floor_operator_id) WHERE end_time IS NULL;
CREATE CONSTRAINT TRIGGER time_entries_shop_floor_operator_id_tenant_check
  AFTER INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('shop_floor_operator_id','operators');
CREATE CONSTRAINT TRIGGER batch_started_shop_floor_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('started_by_shop_floor_operator_id','operators');
CREATE CONSTRAINT TRIGGER batch_completed_shop_floor_tenant_check
  AFTER INSERT OR UPDATE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_reference_tenant('completed_by_shop_floor_operator_id','operators');

CREATE TABLE public.operator_sessions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id,session_id)
);
ALTER TABLE public.operator_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.operator_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.clear_operator_session()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.operator_sessions
  WHERE user_id=auth.uid() AND session_id=NULLIF(auth.jwt()->>'session_id','')::uuid;
$$;
REVOKE ALL ON FUNCTION public.clear_operator_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.clear_operator_session() TO authenticated;

CREATE OR REPLACE FUNCTION "public"."verify_operator_pin"("p_employee_id" "text", "p_pin" "text") RETURNS TABLE("success" boolean, "operator_id" "uuid", "full_name" "text", "employee_id" "text", "tenant_id" "uuid", "error_code" "text", "error_message" "text", "attempts_remaining" integer, "locked_until_ts" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_operator RECORD;
  v_max_attempts CONSTANT INTEGER := 5;
  v_lockout_minutes CONSTANT INTEGER := 15;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  v_tenant_id := get_user_tenant_id();
  IF auth.uid() IS NULL OR NULLIF(auth.jwt()->>'session_id','') IS NULL THEN
    RETURN QUERY SELECT false,NULL::uuid,NULL::text,NULL::text,NULL::uuid,
      'SESSION_REQUIRED'::text,'Sign in before verifying an operator'::text,0,NULL::timestamptz;
    RETURN;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID,
      'NO_TENANT'::TEXT, 'No tenant found for current session'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  SELECT o.id, o.full_name, o.employee_id, o.pin_hash, o.tenant_id,
         COALESCE(o.failed_attempts, 0) as failed_attempts,
         o.locked_until, o.active
  INTO v_operator
  FROM operators o
  WHERE o.tenant_id = v_tenant_id
    AND UPPER(TRIM(o.employee_id)) = UPPER(TRIM(p_employee_id)) FOR UPDATE;

  IF v_operator IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'NOT_FOUND'::TEXT, 'Employee ID not found'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF NOT COALESCE(v_operator.active, false) THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'INACTIVE'::TEXT, 'This account has been deactivated. Contact your supervisor.'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF v_operator.locked_until IS NOT NULL AND v_operator.locked_until > v_now THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'LOCKED'::TEXT,
      'Account is temporarily locked. Try again later.'::TEXT,
      0, v_operator.locked_until;
    RETURN;
  END IF;

  IF v_operator.locked_until IS NOT NULL AND v_operator.locked_until <= v_now THEN
    UPDATE operators SET failed_attempts = 0, locked_until = NULL
    WHERE id = v_operator.id;
    v_operator.failed_attempts := 0;
  END IF;

  IF v_operator.pin_hash = extensions.crypt(p_pin, v_operator.pin_hash) THEN
    UPDATE operators
    SET failed_attempts = 0,
        locked_until = NULL,
        last_login_at = v_now
    WHERE id = v_operator.id;

    DELETE FROM public.operator_sessions WHERE user_id=auth.uid() AND expires_at<now();
    INSERT INTO public.operator_sessions(user_id,session_id,tenant_id,operator_id,expires_at)
    VALUES(auth.uid(),(auth.jwt()->>'session_id')::uuid,v_tenant_id,v_operator.id,now()+interval '12 hours')
    ON CONFLICT(user_id,session_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,
      operator_id=EXCLUDED.operator_id,expires_at=EXCLUDED.expires_at;
    RETURN QUERY SELECT
      true, v_operator.id, v_operator.full_name, v_operator.employee_id, v_operator.tenant_id,
      NULL::TEXT, NULL::TEXT,
      v_max_attempts, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  ELSE
    v_operator.failed_attempts := v_operator.failed_attempts + 1;

    IF v_operator.failed_attempts >= v_max_attempts THEN
      UPDATE operators
      SET failed_attempts = v_operator.failed_attempts,
          locked_until = v_now + (v_lockout_minutes || ' minutes')::INTERVAL
      WHERE id = v_operator.id;

      RETURN QUERY SELECT
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
        'LOCKED'::TEXT,
        format('Account locked. Try again in %s minutes.', v_lockout_minutes)::TEXT,
        0, (v_now + (v_lockout_minutes || ' minutes')::INTERVAL);
      RETURN;
    ELSE
      UPDATE operators
      SET failed_attempts = v_operator.failed_attempts
      WHERE id = v_operator.id;

      RETURN QUERY SELECT
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
        'INVALID_PIN'::TEXT, 'Invalid PIN'::TEXT,
        (v_max_attempts - v_operator.failed_attempts), NULL::TIMESTAMP WITH TIME ZONE;
      RETURN;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_operator_pin(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(text,text) TO authenticated;
