-- Fix the Yellow Card standstill 400.
--
-- 20260628223000_yellow_card_standstill shipped operations.status_before_hold as
-- `text`, but operations.status is the `task_status` enum. The sync trigger
-- (sync_yellow_card_from_standstill) mixes the two in a CASE:
--   status_before_hold = CASE WHEN status <> 'on_hold' THEN status ELSE status_before_hold END
-- which fails at runtime with "CASE types text and task_status cannot be matched".
-- So every issue reported with the "standstill" toggle on returned a 400 from
-- POST /issues, and the Yellow Card never parked the operation.
--
-- Convert the column to task_status so it matches operations.status. Safe: the
-- bug meant the insert always rolled back, so every value is NULL. Idempotent —
-- only runs while the column is still text.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'operations'
      AND column_name = 'status_before_hold'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.operations
      ALTER COLUMN status_before_hold TYPE task_status
      USING status_before_hold::task_status;
  END IF;
END $$;
