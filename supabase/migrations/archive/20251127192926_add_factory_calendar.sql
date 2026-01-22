-- Migration: Add Factory Calendar for scheduling
-- Stores factory closures, holidays, and non-working days

-- Factory Calendar Table
CREATE TABLE IF NOT EXISTS public.factory_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_type TEXT NOT NULL DEFAULT 'working' CHECK (day_type IN ('working', 'holiday', 'closure', 'half_day')),
  name TEXT,  -- e.g., "Christmas", "Factory Maintenance"
  opening_time TIME,  -- Override for this specific day (null = use tenant default)
  closing_time TIME,  -- Override for this specific day (null = use tenant default)
  capacity_multiplier NUMERIC DEFAULT 1.0 CHECK (capacity_multiplier >= 0 AND capacity_multiplier <= 1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, date)
);

-- Comments
COMMENT ON TABLE public.factory_calendar IS 'Factory calendar storing holidays, closures, and special working days';
COMMENT ON COLUMN public.factory_calendar.day_type IS 'Type of day: working (normal), holiday (closed), closure (planned shutdown), half_day (reduced hours)';
COMMENT ON COLUMN public.factory_calendar.capacity_multiplier IS 'Multiplier for capacity: 1.0 = full, 0.5 = half day, 0 = closed';

-- Index for efficient date range queries
CREATE INDEX idx_factory_calendar_tenant_date ON public.factory_calendar(tenant_id, date);

-- Enable RLS
ALTER TABLE public.factory_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's calendar"
  ON public.factory_calendar FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert their tenant's calendar"
  ON public.factory_calendar FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update their tenant's calendar"
  ON public.factory_calendar FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete their tenant's calendar"
  ON public.factory_calendar FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Operation Day Allocations Table
-- Tracks how operations are allocated across multiple days
CREATE TABLE IF NOT EXISTS public.operation_day_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_allocated NUMERIC NOT NULL CHECK (hours_allocated > 0),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(operation_id, date)
);

-- Comments
COMMENT ON TABLE public.operation_day_allocations IS 'Tracks how operations are allocated across days for multi-day scheduling';
COMMENT ON COLUMN public.operation_day_allocations.hours_allocated IS 'Number of hours allocated for this operation on this day';

-- Indexes for efficient capacity queries
CREATE INDEX idx_operation_day_allocations_date ON public.operation_day_allocations(tenant_id, date);
CREATE INDEX idx_operation_day_allocations_cell_date ON public.operation_day_allocations(cell_id, date);
CREATE INDEX idx_operation_day_allocations_operation ON public.operation_day_allocations(operation_id);

-- Enable RLS
ALTER TABLE public.operation_day_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's allocations"
  ON public.operation_day_allocations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage allocations"
  ON public.operation_day_allocations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Add default working days configuration to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS working_days_mask INTEGER DEFAULT 31;
-- Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
-- Default 31 = Mon-Fri (1+2+4+8+16)

COMMENT ON COLUMN public.tenants.working_days_mask IS 'Bitmask for working days: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64. Default 31 = Mon-Fri';

-- Trigger to update updated_at on factory_calendar
CREATE OR REPLACE FUNCTION update_factory_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER factory_calendar_updated_at
  BEFORE UPDATE ON public.factory_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_factory_calendar_updated_at();
