-- Create attendance_entries table for employee clock-in/clock-out tracking
CREATE TABLE public.attendance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'auto_closed')),
  shift_id UUID REFERENCES public.factory_shifts(id) ON DELETE SET NULL,
  target_hours NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT attendance_has_operator CHECK (operator_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_attendance_entries_tenant_id ON public.attendance_entries(tenant_id);
CREATE INDEX idx_attendance_entries_operator_id ON public.attendance_entries(operator_id);
CREATE INDEX idx_attendance_entries_profile_id ON public.attendance_entries(profile_id);
CREATE INDEX idx_attendance_entries_clock_in ON public.attendance_entries(clock_in);
CREATE INDEX idx_attendance_entries_status ON public.attendance_entries(status);

-- Enable RLS
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view attendance in their tenant" 
ON public.attendance_entries 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert attendance in their tenant" 
ON public.attendance_entries 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update attendance in their tenant" 
ON public.attendance_entries 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete attendance in their tenant" 
ON public.attendance_entries 
FOR DELETE 
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_attendance_entries_updated_at
BEFORE UPDATE ON public.attendance_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_tenant_updated_at();

-- Function to clock in an operator
CREATE OR REPLACE FUNCTION public.operator_clock_in(
  p_operator_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_entry_id UUID;
  v_shift_id UUID;
  v_target_hours NUMERIC(5,2);
  v_current_time TIME;
  v_current_day INTEGER;
BEGIN
  -- Get tenant_id from operator
  SELECT tenant_id INTO v_tenant_id FROM operators WHERE id = p_operator_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Operator not found';
  END IF;
  
  -- Check if already clocked in
  IF EXISTS (
    SELECT 1 FROM attendance_entries 
    WHERE operator_id = p_operator_id 
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Operator already clocked in';
  END IF;
  
  -- Get current time and day of week (1=Monday, 7=Sunday)
  v_current_time := CURRENT_TIME;
  v_current_day := EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER;
  
  -- Find matching active shift
  SELECT id, 
    EXTRACT(EPOCH FROM (end_time::TIME - start_time::TIME)) / 3600.0
  INTO v_shift_id, v_target_hours
  FROM factory_shifts
  WHERE tenant_id = v_tenant_id
    AND is_active = true
    AND v_current_day = ANY(active_days)
    AND v_current_time BETWEEN start_time::TIME AND end_time::TIME
  LIMIT 1;
  
  -- If no matching shift, use default 8 hours
  IF v_target_hours IS NULL THEN
    v_target_hours := 8.0;
  END IF;
  
  -- Create attendance entry
  INSERT INTO attendance_entries (
    tenant_id,
    operator_id,
    shift_id,
    target_hours,
    notes,
    status
  ) VALUES (
    v_tenant_id,
    p_operator_id,
    v_shift_id,
    v_target_hours,
    p_notes,
    'active'
  )
  RETURNING id INTO v_entry_id;
  
  -- Update operator last_login_at
  UPDATE operators SET last_login_at = now() WHERE id = p_operator_id;
  
  RETURN v_entry_id;
END;
$$;

-- Function to clock out an operator
CREATE OR REPLACE FUNCTION public.operator_clock_out(
  p_operator_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_id UUID;
  v_clock_in TIMESTAMP WITH TIME ZONE;
  v_duration INTEGER;
BEGIN
  -- Find active attendance entry
  SELECT id, clock_in INTO v_entry_id, v_clock_in
  FROM attendance_entries
  WHERE operator_id = p_operator_id
    AND status = 'active'
  ORDER BY clock_in DESC
  LIMIT 1;
  
  IF v_entry_id IS NULL THEN
    RAISE EXCEPTION 'No active clock-in found';
  END IF;
  
  -- Calculate duration in minutes
  v_duration := EXTRACT(EPOCH FROM (now() - v_clock_in)) / 60;
  
  -- Update attendance entry
  UPDATE attendance_entries
  SET 
    clock_out = now(),
    duration_minutes = v_duration,
    status = 'completed',
    notes = COALESCE(p_notes, notes)
  WHERE id = v_entry_id;
  
  RETURN true;
END;
$$;

-- Function to get operator attendance status
CREATE OR REPLACE FUNCTION public.get_operator_attendance_status(p_operator_id UUID)
RETURNS TABLE(
  is_clocked_in BOOLEAN,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  current_duration_minutes INTEGER,
  target_hours NUMERIC,
  shift_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.status = 'active' AS is_clocked_in,
    ae.clock_in AS clock_in_time,
    EXTRACT(EPOCH FROM (now() - ae.clock_in))::INTEGER / 60 AS current_duration_minutes,
    ae.target_hours,
    fs.name AS shift_name
  FROM attendance_entries ae
  LEFT JOIN factory_shifts fs ON fs.id = ae.shift_id
  WHERE ae.operator_id = p_operator_id
    AND ae.status = 'active'
  ORDER BY ae.clock_in DESC
  LIMIT 1;
END;
$$;

-- Function to auto-close stale attendance entries (for cron job)
CREATE OR REPLACE FUNCTION public.auto_close_stale_attendance()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Close any attendance entries that are still active after 16 hours
  UPDATE attendance_entries
  SET 
    clock_out = clock_in + INTERVAL '16 hours',
    duration_minutes = 16 * 60,
    status = 'auto_closed'
  WHERE status = 'active'
    AND clock_in < now() - INTERVAL '16 hours';
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;