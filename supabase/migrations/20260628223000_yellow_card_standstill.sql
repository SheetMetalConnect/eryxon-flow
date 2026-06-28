-- Yellow Card = an operation parked (status 'on_hold') because of a standstill
-- reported with an issue. Previously the operator could never raise one and a
-- resolved issue never released the operation. This wires the lifecycle:
--   report issue + "standstill?" -> operation parked (Yellow Card on)
--   the issue is resolved/closed -> operation released (Yellow Card off)
-- driven by a trigger so it holds no matter which path resolves the issue.

-- Mark the issues that put the floor at a standstill.
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS causes_standstill boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.issues.causes_standstill IS
  'True when the reported issue parks its operation under a Yellow Card until resolved.';

-- Remember what the operation was doing before it was parked, so releasing it
-- restores the right state instead of guessing 'in_progress'.
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS status_before_hold text;

COMMENT ON COLUMN public.operations.status_before_hold IS
  'Operation status captured when a Yellow Card parked it, restored on release.';

CREATE OR REPLACE FUNCTION public.sync_yellow_card_from_standstill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_standstills integer;
BEGIN
  -- Open standstill (issue is pending) -> park the operation.
  IF NEW.causes_standstill AND NEW.status = 'pending' THEN
    UPDATE public.operations
      SET status_before_hold = CASE WHEN status <> 'on_hold' THEN status ELSE status_before_hold END,
          status = 'on_hold'
      WHERE id = NEW.operation_id AND status <> 'completed';
    RETURN NEW;
  END IF;

  -- A standstill clearing -> release the operation, but only once no other
  -- standstill is still open on it. This covers the issue leaving 'pending'
  -- (resolved/closed) and the standstill flag being turned off while pending.
  IF TG_OP = 'UPDATE'
     AND OLD.causes_standstill AND OLD.status = 'pending'
     AND (NEW.status IS DISTINCT FROM 'pending' OR NOT NEW.causes_standstill) THEN
    SELECT count(*) INTO open_standstills
      FROM public.issues
      WHERE operation_id = NEW.operation_id
        AND causes_standstill
        AND status = 'pending'
        AND id <> NEW.id;

    IF open_standstills = 0 THEN
      UPDATE public.operations
        SET status = COALESCE(status_before_hold, 'in_progress'),
            status_before_hold = NULL
        WHERE id = NEW.operation_id AND status = 'on_hold';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_yellow_card ON public.issues;
CREATE TRIGGER trg_sync_yellow_card
  AFTER INSERT OR UPDATE OF status, causes_standstill ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_yellow_card_from_standstill();
