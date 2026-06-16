DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'batch_production_mode'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.batch_production_mode AS ENUM ('manual', 'automated');
  END IF;
END $$;

ALTER TABLE public.operation_batches
ADD COLUMN IF NOT EXISTS production_mode public.batch_production_mode NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'operation_batches_automated_laser_only'
  ) THEN
    ALTER TABLE public.operation_batches
      ADD CONSTRAINT operation_batches_automated_laser_only
      CHECK (
        production_mode <> 'automated'
        OR batch_type = 'laser_nesting'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.operation_batches.production_mode IS
  'How the batch is expected to progress through production: manual operator control or automated machine monitoring.';
