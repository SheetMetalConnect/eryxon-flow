-- Migration: Add helper functions for factory calendar operations
-- These functions provide utilities for scheduling and capacity calculations

-- Function: Get working days in a date range for a tenant
-- Returns all calendar entries plus generates defaults for days without explicit entries
CREATE OR REPLACE FUNCTION get_calendar_days_in_range(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  day_type TEXT,
  name TEXT,
  opening_time TIME,
  closing_time TIME,
  capacity_multiplier NUMERIC,
  is_custom_entry BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_working_days_mask INTEGER;
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_mask_bits INTEGER[] := ARRAY[64, 1, 2, 4, 8, 16, 32]; -- Sun=64, Mon=1, ..., Sat=32
BEGIN
  -- Get tenant's working days mask (default Mon-Fri = 31)
  SELECT COALESCE(t.working_days_mask, 31)
  INTO v_working_days_mask
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- If tenant not found, use default
  IF v_working_days_mask IS NULL THEN
    v_working_days_mask := 31;
  END IF;

  -- Loop through each date in range
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    -- Check if there's a custom entry for this date
    SELECT
      fc.date,
      fc.day_type,
      fc.name,
      fc.opening_time,
      fc.closing_time,
      fc.capacity_multiplier,
      TRUE
    INTO date, day_type, name, opening_time, closing_time, capacity_multiplier, is_custom_entry
    FROM factory_calendar fc
    WHERE fc.tenant_id = p_tenant_id AND fc.date = v_current_date;

    IF FOUND THEN
      RETURN NEXT;
    ELSE
      -- No custom entry - generate default based on working days mask
      -- PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
      v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;

      date := v_current_date;
      name := NULL;
      opening_time := NULL;
      closing_time := NULL;
      is_custom_entry := FALSE;

      IF (v_working_days_mask & v_mask_bits[v_day_of_week + 1]) > 0 THEN
        day_type := 'working';
        capacity_multiplier := 1.0;
      ELSE
        day_type := 'closure';
        capacity_multiplier := 0.0;
      END IF;

      RETURN NEXT;
    END IF;

    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_calendar_days_in_range(UUID, DATE, DATE) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_calendar_days_in_range IS 'Returns calendar days in a date range, including both custom entries and generated defaults based on working days mask';


-- Function: Check if a specific date is a working day for a tenant
CREATE OR REPLACE FUNCTION is_working_day(
  p_tenant_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_working_days_mask INTEGER;
  v_day_of_week INTEGER;
  v_mask_bits INTEGER[] := ARRAY[64, 1, 2, 4, 8, 16, 32];
  v_custom_entry RECORD;
BEGIN
  -- Check for custom calendar entry first
  SELECT day_type, capacity_multiplier
  INTO v_custom_entry
  FROM factory_calendar
  WHERE tenant_id = p_tenant_id AND date = p_date;

  IF FOUND THEN
    -- Has custom entry - check if it's a working day (capacity > 0)
    RETURN v_custom_entry.day_type = 'working' OR
           (v_custom_entry.day_type = 'half_day' AND COALESCE(v_custom_entry.capacity_multiplier, 0) > 0);
  END IF;

  -- No custom entry - check working days mask
  SELECT COALESCE(t.working_days_mask, 31)
  INTO v_working_days_mask
  FROM tenants t
  WHERE t.id = p_tenant_id;

  IF v_working_days_mask IS NULL THEN
    v_working_days_mask := 31;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  RETURN (v_working_days_mask & v_mask_bits[v_day_of_week + 1]) > 0;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_working_day(UUID, DATE) TO authenticated;

-- Comment
COMMENT ON FUNCTION is_working_day IS 'Checks if a specific date is a working day for a tenant, considering both custom entries and default working days';


-- Function: Get the next working day from a given date
CREATE OR REPLACE FUNCTION get_next_working_day(
  p_tenant_id UUID,
  p_from_date DATE,
  p_include_start BOOLEAN DEFAULT FALSE
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date DATE;
  v_max_search INTEGER := 365; -- Maximum days to search
  v_count INTEGER := 0;
BEGIN
  IF p_include_start THEN
    v_current_date := p_from_date;
  ELSE
    v_current_date := p_from_date + INTERVAL '1 day';
  END IF;

  WHILE v_count < v_max_search LOOP
    IF is_working_day(p_tenant_id, v_current_date) THEN
      RETURN v_current_date;
    END IF;
    v_current_date := v_current_date + INTERVAL '1 day';
    v_count := v_count + 1;
  END LOOP;

  -- If no working day found within a year, return null
  RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_next_working_day(UUID, DATE, BOOLEAN) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_next_working_day IS 'Returns the next working day from a given date for a tenant';


-- Function: Count working days between two dates
CREATE OR REPLACE FUNCTION count_working_days(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_current_date DATE;
BEGIN
  v_current_date := p_start_date;

  WHILE v_current_date <= p_end_date LOOP
    IF is_working_day(p_tenant_id, v_current_date) THEN
      v_count := v_count + 1;
    END IF;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION count_working_days(UUID, DATE, DATE) TO authenticated;

-- Comment
COMMENT ON FUNCTION count_working_days IS 'Counts the number of working days between two dates for a tenant';


-- Function: Get total capacity hours for a date range
CREATE OR REPLACE FUNCTION get_capacity_hours_in_range(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_hours NUMERIC := 0;
  v_day RECORD;
  v_opening_time TIME;
  v_closing_time TIME;
  v_daily_hours NUMERIC;
BEGIN
  -- Get tenant's default opening/closing times
  SELECT
    COALESCE(factory_opening_time, '08:00:00'::TIME),
    COALESCE(factory_closing_time, '17:00:00'::TIME)
  INTO v_opening_time, v_closing_time
  FROM tenants
  WHERE id = p_tenant_id;

  IF v_opening_time IS NULL THEN
    v_opening_time := '08:00:00'::TIME;
    v_closing_time := '17:00:00'::TIME;
  END IF;

  -- Calculate default daily hours
  v_daily_hours := EXTRACT(EPOCH FROM (v_closing_time - v_opening_time)) / 3600.0;

  -- Sum up capacity for each day
  FOR v_day IN SELECT * FROM get_calendar_days_in_range(p_tenant_id, p_start_date, p_end_date) LOOP
    IF v_day.day_type IN ('working', 'half_day') AND COALESCE(v_day.capacity_multiplier, 1.0) > 0 THEN
      -- Use custom times if provided, otherwise use defaults
      IF v_day.opening_time IS NOT NULL AND v_day.closing_time IS NOT NULL THEN
        v_total_hours := v_total_hours +
          (EXTRACT(EPOCH FROM (v_day.closing_time - v_day.opening_time)) / 3600.0);
      ELSE
        v_total_hours := v_total_hours + (v_daily_hours * COALESCE(v_day.capacity_multiplier, 1.0));
      END IF;
    END IF;
  END LOOP;

  RETURN v_total_hours;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_capacity_hours_in_range(UUID, DATE, DATE) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_capacity_hours_in_range IS 'Calculates total available capacity hours in a date range for a tenant';


-- Function: Bulk upsert calendar entries (for importing)
CREATE OR REPLACE FUNCTION upsert_calendar_entries(
  p_tenant_id UUID,
  p_entries JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Verify user is admin for this tenant
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tenant_id = p_tenant_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can bulk upsert calendar entries';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO factory_calendar (
      tenant_id,
      date,
      day_type,
      name,
      opening_time,
      closing_time,
      capacity_multiplier,
      notes
    ) VALUES (
      p_tenant_id,
      (v_entry->>'date')::DATE,
      COALESCE(v_entry->>'day_type', 'holiday'),
      v_entry->>'name',
      (v_entry->>'opening_time')::TIME,
      (v_entry->>'closing_time')::TIME,
      COALESCE((v_entry->>'capacity_multiplier')::NUMERIC, 0),
      v_entry->>'notes'
    )
    ON CONFLICT (tenant_id, date) DO UPDATE SET
      day_type = EXCLUDED.day_type,
      name = EXCLUDED.name,
      opening_time = EXCLUDED.opening_time,
      closing_time = EXCLUDED.closing_time,
      capacity_multiplier = EXCLUDED.capacity_multiplier,
      notes = EXCLUDED.notes,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_calendar_entries(UUID, JSONB) TO authenticated;

-- Comment
COMMENT ON FUNCTION upsert_calendar_entries IS 'Bulk upsert calendar entries for importing holidays or pre-configured dates';
