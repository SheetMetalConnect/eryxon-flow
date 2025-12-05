-- ============================================================================
-- AUTO-CALCULATE JOB SHIPPING TOTALS FROM PARTS
-- ============================================================================
-- Jobs should not have manual entry for weight/volume/package_count.
-- These values are calculated from the sum of all parts in the job.
-- This trigger automatically updates jobs.total_weight_kg, total_volume_m3
-- whenever parts are inserted, updated, or deleted.
-- ============================================================================

-- Function to recalculate job shipping totals from parts
CREATE OR REPLACE FUNCTION update_job_shipping_totals()
RETURNS TRIGGER AS $$
DECLARE
  affected_job_id UUID;
  calc_weight DECIMAL(10, 2);
  calc_volume DECIMAL(10, 6);
  part_count INTEGER;
BEGIN
  -- Determine which job_id to update
  IF TG_OP = 'DELETE' THEN
    affected_job_id := OLD.job_id;
  ELSE
    affected_job_id := NEW.job_id;
  END IF;

  -- Skip if no job_id
  IF affected_job_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate total weight from all parts in the job
  -- Weight = sum of (part.weight_kg * part.quantity)
  SELECT
    COALESCE(SUM(weight_kg * COALESCE(quantity, 1)), 0),
    COALESCE(SUM(
      CASE
        WHEN length_mm IS NOT NULL AND width_mm IS NOT NULL AND height_mm IS NOT NULL
        THEN (length_mm * width_mm * height_mm / 1000000000.0) * COALESCE(quantity, 1)
        ELSE 0
      END
    ), 0),
    COUNT(*)
  INTO calc_weight, calc_volume, part_count
  FROM public.parts
  WHERE job_id = affected_job_id;

  -- Update the job with calculated totals
  UPDATE public.jobs
  SET
    total_weight_kg = CASE WHEN calc_weight > 0 THEN calc_weight ELSE NULL END,
    total_volume_m3 = CASE WHEN calc_volume > 0 THEN calc_volume ELSE NULL END,
    package_count = CASE WHEN part_count > 0 THEN part_count ELSE NULL END,
    updated_at = NOW()
  WHERE id = affected_job_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_job_shipping_totals ON public.parts;

-- Create trigger on parts table for INSERT, UPDATE, DELETE
CREATE TRIGGER trigger_update_job_shipping_totals
AFTER INSERT OR UPDATE OF weight_kg, length_mm, width_mm, height_mm, quantity, job_id
    OR DELETE ON public.parts
FOR EACH ROW
EXECUTE FUNCTION update_job_shipping_totals();

-- Also handle job_id changes (part moved to different job)
-- When job_id changes, we need to update BOTH the old and new job
CREATE OR REPLACE FUNCTION update_job_shipping_totals_on_move()
RETURNS TRIGGER AS $$
BEGIN
  -- If job_id changed, update the OLD job too
  IF OLD.job_id IS DISTINCT FROM NEW.job_id AND OLD.job_id IS NOT NULL THEN
    -- Recalculate old job
    WITH calcs AS (
      SELECT
        COALESCE(SUM(weight_kg * COALESCE(quantity, 1)), 0) as calc_weight,
        COALESCE(SUM(
          CASE
            WHEN length_mm IS NOT NULL AND width_mm IS NOT NULL AND height_mm IS NOT NULL
            THEN (length_mm * width_mm * height_mm / 1000000000.0) * COALESCE(quantity, 1)
            ELSE 0
          END
        ), 0) as calc_volume,
        COUNT(*) as part_count
      FROM public.parts
      WHERE job_id = OLD.job_id
    )
    UPDATE public.jobs
    SET
      total_weight_kg = CASE WHEN calcs.calc_weight > 0 THEN calcs.calc_weight ELSE NULL END,
      total_volume_m3 = CASE WHEN calcs.calc_volume > 0 THEN calcs.calc_volume ELSE NULL END,
      package_count = CASE WHEN calcs.part_count > 0 THEN calcs.part_count ELSE NULL END,
      updated_at = NOW()
    FROM calcs
    WHERE id = OLD.job_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_job_shipping_on_move ON public.parts;

CREATE TRIGGER trigger_update_job_shipping_on_move
AFTER UPDATE OF job_id ON public.parts
FOR EACH ROW
WHEN (OLD.job_id IS DISTINCT FROM NEW.job_id)
EXECUTE FUNCTION update_job_shipping_totals_on_move();

-- ============================================================================
-- BACKFILL: Calculate totals for all existing jobs
-- ============================================================================
DO $$
BEGIN
  UPDATE public.jobs j
  SET
    total_weight_kg = calcs.calc_weight,
    total_volume_m3 = calcs.calc_volume,
    package_count = calcs.part_count,
    updated_at = NOW()
  FROM (
    SELECT
      job_id,
      CASE WHEN SUM(weight_kg * COALESCE(quantity, 1)) > 0
           THEN SUM(weight_kg * COALESCE(quantity, 1))
           ELSE NULL END as calc_weight,
      CASE WHEN SUM(
        CASE
          WHEN length_mm IS NOT NULL AND width_mm IS NOT NULL AND height_mm IS NOT NULL
          THEN (length_mm * width_mm * height_mm / 1000000000.0) * COALESCE(quantity, 1)
          ELSE 0
        END
      ) > 0
      THEN SUM(
        CASE
          WHEN length_mm IS NOT NULL AND width_mm IS NOT NULL AND height_mm IS NOT NULL
          THEN (length_mm * width_mm * height_mm / 1000000000.0) * COALESCE(quantity, 1)
          ELSE 0
        END
      )
      ELSE NULL END as calc_volume,
      CASE WHEN COUNT(*) > 0 THEN COUNT(*) ELSE NULL END as part_count
    FROM public.parts
    WHERE job_id IS NOT NULL
    GROUP BY job_id
  ) calcs
  WHERE j.id = calcs.job_id;
END $$;

-- ============================================================================
-- Add comment explaining these are auto-calculated fields
-- ============================================================================
COMMENT ON COLUMN public.jobs.total_weight_kg IS 'Auto-calculated from sum of parts weight_kg * quantity';
COMMENT ON COLUMN public.jobs.total_volume_m3 IS 'Auto-calculated from sum of parts dimensions (L*W*H/1e9) * quantity';
COMMENT ON COLUMN public.jobs.package_count IS 'Auto-calculated as count of parts in job';
