-- PART 1: Add enterprise enum value only (must be separate transaction)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'enterprise'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_plan')
  ) THEN
    ALTER TYPE subscription_plan ADD VALUE 'enterprise';
  END IF;
END $$;