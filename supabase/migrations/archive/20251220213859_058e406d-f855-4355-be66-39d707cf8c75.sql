-- ============================================================================
-- EXPECTATIONS & EXCEPTIONS REGISTRY
-- Three Registries Pattern: Beliefs, Facts, and Judgments
-- ============================================================================

-- Create enum for expectation types
CREATE TYPE expectation_type AS ENUM (
  'completion_time',    -- Job/Operation should complete by X
  'duration',           -- Operation should take X time
  'quantity',           -- Should produce X quantity
  'delivery'            -- Should be delivered by X
);

-- Create enum for exception types
CREATE TYPE exception_type AS ENUM (
  'late',               -- Completed after expected time
  'early',              -- Completed before expected time (informational)
  'non_occurrence',     -- Never completed (deadline passed)
  'exceeded',           -- Value exceeded (quantity/duration)
  'under'               -- Value under (quantity)
);

-- Create enum for exception status
CREATE TYPE exception_status AS ENUM (
  'open',               -- Newly detected, needs attention
  'acknowledged',       -- Someone is looking at it
  'resolved',           -- Root cause identified and addressed
  'dismissed'           -- Determined to be acceptable/not actionable
);

-- ============================================================================
-- EXPECTATIONS TABLE (The Beliefs Registry)
-- Records what we believed should happen at a point in time
-- Immutable: Never updated, only superseded
-- ============================================================================
CREATE TABLE expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What entity this expectation is about
  entity_type TEXT NOT NULL CHECK (entity_type IN ('job', 'operation', 'part', 'shipment')),
  entity_id UUID NOT NULL,
  
  -- The type of expectation
  expectation_type expectation_type NOT NULL,
  
  -- Human-readable belief statement
  belief_statement TEXT NOT NULL,
  
  -- Structured expected value (flexible JSON for different expectation types)
  -- Examples:
  -- { "due_at": "2024-01-15T15:00:00Z" }
  -- { "duration_minutes": 60, "tolerance_percent": 10 }
  -- { "quantity": 100, "min_quantity": 95 }
  expected_value JSONB NOT NULL,
  
  -- When we expect this to be fulfilled
  expected_at TIMESTAMPTZ,
  
  -- Versioning: expectations are never edited, only superseded
  version INT NOT NULL DEFAULT 1,
  superseded_by UUID REFERENCES expectations(id),
  superseded_at TIMESTAMPTZ,
  
  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  -- Where this expectation came from
  source TEXT NOT NULL CHECK (source IN ('erp_sync', 'manual', 'scheduler', 'auto_replan', 'system')),
  
  -- Additional context about why this expectation was set
  context JSONB DEFAULT '{}'::jsonb,
  
  -- Search optimization
  search_vector TSVECTOR
);

-- Create indexes for expectations
CREATE INDEX idx_expectations_tenant ON expectations(tenant_id);
CREATE INDEX idx_expectations_entity ON expectations(entity_type, entity_id);
CREATE INDEX idx_expectations_active ON expectations(tenant_id, superseded_by) WHERE superseded_by IS NULL;
CREATE INDEX idx_expectations_expected_at ON expectations(expected_at) WHERE superseded_by IS NULL;
CREATE INDEX idx_expectations_search ON expectations USING GIN(search_vector);

-- Enable RLS
ALTER TABLE expectations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expectations
CREATE POLICY "Users can view expectations in their tenant"
  ON expectations FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create expectations"
  ON expectations FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update expectations (supersede only)"
  ON expectations FOR UPDATE
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- System insert policy for triggers
CREATE POLICY "System can insert expectations"
  ON expectations FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() OR CURRENT_USER = 'postgres');

-- ============================================================================
-- EXCEPTIONS TABLE (The Judgments Registry)
-- Records when reality misaligned with an expectation
-- This is where learning happens
-- ============================================================================
CREATE TABLE exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- The expectation that was violated
  expectation_id UUID NOT NULL REFERENCES expectations(id) ON DELETE CASCADE,
  
  -- Type of exception
  exception_type exception_type NOT NULL,
  
  -- Workflow status
  status exception_status NOT NULL DEFAULT 'open',
  
  -- What actually happened (structured data)
  -- Examples:
  -- { "completed_at": "2024-01-15T15:34:00Z" }
  -- { "actual_duration_minutes": 95 }
  -- { "actual_quantity": 85 }
  actual_value JSONB,
  
  -- When the actual event occurred (NULL for non_occurrence)
  occurred_at TIMESTAMPTZ,
  
  -- How far off were we?
  deviation_amount NUMERIC,
  deviation_unit TEXT, -- 'minutes', 'hours', 'quantity', 'percent'
  
  -- Detection tracking
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detected_by_event UUID, -- Reference to activity_log entry that triggered detection
  
  -- Resolution workflow
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution JSONB, -- { "action_taken": "...", "new_expectation_id": "..." }
  
  -- Learning fields
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Search optimization
  search_vector TSVECTOR
);

-- Create indexes for exceptions
CREATE INDEX idx_exceptions_tenant ON exceptions(tenant_id);
CREATE INDEX idx_exceptions_expectation ON exceptions(expectation_id);
CREATE INDEX idx_exceptions_status ON exceptions(tenant_id, status);
CREATE INDEX idx_exceptions_detected ON exceptions(detected_at DESC);
CREATE INDEX idx_exceptions_open ON exceptions(tenant_id) WHERE status = 'open';
CREATE INDEX idx_exceptions_search ON exceptions USING GIN(search_vector);

-- Enable RLS
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exceptions
CREATE POLICY "Users can view exceptions in their tenant"
  ON exceptions FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create exceptions"
  ON exceptions FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exceptions"
  ON exceptions FOR UPDATE
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exceptions"
  ON exceptions FOR DELETE
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- System insert/update policy for triggers and detection
CREATE POLICY "System can manage exceptions"
  ON exceptions FOR ALL
  USING (tenant_id = get_user_tenant_id() OR CURRENT_USER = 'postgres')
  WITH CHECK (tenant_id = get_user_tenant_id() OR CURRENT_USER = 'postgres');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create an expectation for a job's due date
CREATE OR REPLACE FUNCTION create_job_completion_expectation(
  p_job_id UUID,
  p_tenant_id UUID,
  p_due_date TIMESTAMPTZ,
  p_source TEXT DEFAULT 'system',
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_number TEXT;
  v_expectation_id UUID;
BEGIN
  SELECT job_number INTO v_job_number FROM jobs WHERE id = p_job_id;
  
  INSERT INTO expectations (
    tenant_id,
    entity_type,
    entity_id,
    expectation_type,
    belief_statement,
    expected_value,
    expected_at,
    source,
    created_by,
    context
  ) VALUES (
    p_tenant_id,
    'job',
    p_job_id,
    'completion_time',
    format('Job %s should be completed on time', v_job_number),
    jsonb_build_object('due_at', p_due_date),
    p_due_date,
    p_source,
    p_created_by,
    jsonb_build_object('job_number', v_job_number)
  )
  RETURNING id INTO v_expectation_id;
  
  RETURN v_expectation_id;
END;
$$;

-- Function to supersede an expectation (when replanning)
CREATE OR REPLACE FUNCTION supersede_expectation(
  p_expectation_id UUID,
  p_new_expected_value JSONB,
  p_new_expected_at TIMESTAMPTZ,
  p_source TEXT DEFAULT 'auto_replan',
  p_created_by UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_exp RECORD;
  v_new_id UUID;
BEGIN
  -- Get the old expectation
  SELECT * INTO v_old_exp FROM expectations WHERE id = p_expectation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expectation not found';
  END IF;
  
  -- Create new expectation
  INSERT INTO expectations (
    tenant_id,
    entity_type,
    entity_id,
    expectation_type,
    belief_statement,
    expected_value,
    expected_at,
    version,
    source,
    created_by,
    context
  ) VALUES (
    v_old_exp.tenant_id,
    v_old_exp.entity_type,
    v_old_exp.entity_id,
    v_old_exp.expectation_type,
    v_old_exp.belief_statement || ' (replanned)',
    p_new_expected_value,
    p_new_expected_at,
    v_old_exp.version + 1,
    p_source,
    COALESCE(p_created_by, auth.uid()),
    p_context || jsonb_build_object('previous_expectation_id', p_expectation_id)
  )
  RETURNING id INTO v_new_id;
  
  -- Mark old expectation as superseded
  UPDATE expectations
  SET superseded_by = v_new_id,
      superseded_at = now()
  WHERE id = p_expectation_id;
  
  RETURN v_new_id;
END;
$$;

-- Function to detect and create exception when job completes late
CREATE OR REPLACE FUNCTION detect_job_completion_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expectation RECORD;
  v_deviation_minutes NUMERIC;
BEGIN
  -- Only run when job status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find the active expectation for this job
    SELECT * INTO v_expectation
    FROM expectations
    WHERE entity_type = 'job'
      AND entity_id = NEW.id
      AND expectation_type = 'completion_time'
      AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND AND v_expectation.expected_at IS NOT NULL THEN
      v_deviation_minutes := EXTRACT(EPOCH FROM (now() - v_expectation.expected_at)) / 60;
      
      -- If completed late (more than 1 minute after expected)
      IF v_deviation_minutes > 1 THEN
        INSERT INTO exceptions (
          tenant_id,
          expectation_id,
          exception_type,
          status,
          actual_value,
          occurred_at,
          deviation_amount,
          deviation_unit,
          metadata
        ) VALUES (
          NEW.tenant_id,
          v_expectation.id,
          'late',
          'open',
          jsonb_build_object('completed_at', now()),
          now(),
          v_deviation_minutes,
          'minutes',
          jsonb_build_object('job_number', NEW.job_number)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for job completion exception detection
CREATE TRIGGER detect_job_completion_exception_trigger
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION detect_job_completion_exception();

-- Function to get exception summary stats
CREATE OR REPLACE FUNCTION get_exception_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
  open_count BIGINT,
  acknowledged_count BIGINT,
  resolved_count BIGINT,
  dismissed_count BIGINT,
  total_count BIGINT,
  avg_resolution_time_hours NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'acknowledged')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'dismissed')::BIGINT,
    COUNT(*)::BIGINT,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL), 2)
  FROM exceptions
  WHERE tenant_id = v_tenant_id;
END;
$$;

-- Function to acknowledge an exception
CREATE OR REPLACE FUNCTION acknowledge_exception(p_exception_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE exceptions
  SET status = 'acknowledged',
      acknowledged_at = now(),
      acknowledged_by = auth.uid()
  WHERE id = p_exception_id
    AND tenant_id = get_user_tenant_id()
    AND status = 'open';
END;
$$;

-- Function to resolve an exception
CREATE OR REPLACE FUNCTION resolve_exception(
  p_exception_id UUID,
  p_root_cause TEXT DEFAULT NULL,
  p_corrective_action TEXT DEFAULT NULL,
  p_preventive_action TEXT DEFAULT NULL,
  p_resolution JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE exceptions
  SET status = 'resolved',
      resolved_at = now(),
      resolved_by = auth.uid(),
      root_cause = COALESCE(p_root_cause, root_cause),
      corrective_action = COALESCE(p_corrective_action, corrective_action),
      preventive_action = COALESCE(p_preventive_action, preventive_action),
      resolution = COALESCE(p_resolution, resolution)
  WHERE id = p_exception_id
    AND tenant_id = get_user_tenant_id()
    AND status IN ('open', 'acknowledged');
END;
$$;

-- Function to dismiss an exception
CREATE OR REPLACE FUNCTION dismiss_exception(p_exception_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE exceptions
  SET status = 'dismissed',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution = jsonb_build_object('dismiss_reason', p_reason)
  WHERE id = p_exception_id
    AND tenant_id = get_user_tenant_id();
END;
$$;

-- Update search vectors
CREATE OR REPLACE FUNCTION update_expectation_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.belief_statement, '') || ' ' ||
    coalesce(NEW.entity_type, '') || ' ' ||
    coalesce(NEW.source, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_expectation_search_vector_trigger
  BEFORE INSERT OR UPDATE ON expectations
  FOR EACH ROW
  EXECUTE FUNCTION update_expectation_search_vector();

CREATE OR REPLACE FUNCTION update_exception_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.root_cause, '') || ' ' ||
    coalesce(NEW.corrective_action, '') || ' ' ||
    coalesce(NEW.preventive_action, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_exception_search_vector_trigger
  BEFORE INSERT OR UPDATE ON exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_exception_search_vector();