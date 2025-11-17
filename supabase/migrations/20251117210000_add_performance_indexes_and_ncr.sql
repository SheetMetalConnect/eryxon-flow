-- =====================================================================
-- Migration: Add Performance Indexes and NCR (Non-Conformance Report) Enhancements
-- Description: Optimizes database queries and adds comprehensive NCR tracking
-- =====================================================================

-- ========================================
-- PART 1: Performance Indexes
-- ========================================

-- Jobs table indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_created ON jobs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_due_date ON jobs (tenant_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs (tenant_id, customer) WHERE customer IS NOT NULL;

-- Parts table indexes
CREATE INDEX IF NOT EXISTS idx_parts_tenant_status ON parts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_parts_tenant_job ON parts (tenant_id, job_id);
CREATE INDEX IF NOT EXISTS idx_parts_tenant_material ON parts (tenant_id, material);
CREATE INDEX IF NOT EXISTS idx_parts_parent ON parts (parent_part_id) WHERE parent_part_id IS NOT NULL;

-- Operations table indexes
CREATE INDEX IF NOT EXISTS idx_operations_tenant_status ON operations (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_operations_tenant_part ON operations (tenant_id, part_id);
CREATE INDEX IF NOT EXISTS idx_operations_tenant_cell ON operations (tenant_id, cell_id);
CREATE INDEX IF NOT EXISTS idx_operations_assigned ON operations (assigned_operator_id) WHERE assigned_operator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_sequence ON operations (part_id, sequence);

-- Issues table indexes
CREATE INDEX IF NOT EXISTS idx_issues_tenant_status ON issues (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_tenant_severity ON issues (tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_issues_operation ON issues (operation_id);
CREATE INDEX IF NOT EXISTS idx_issues_reported_by ON issues (reported_by_id) WHERE reported_by_id IS NOT NULL;

-- Webhooks table indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_active ON webhooks (tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs (webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs (status_code, created_at DESC);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_operation ON time_entries (operation_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_active ON time_entries (operation_id, end_time) WHERE end_time IS NULL;

-- Substeps indexes
CREATE INDEX IF NOT EXISTS idx_substeps_operation ON substeps (operation_id, sequence);
CREATE INDEX IF NOT EXISTS idx_substeps_tenant_completed ON substeps (tenant_id, completed);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON api_keys (tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix) WHERE active = true;

-- ========================================
-- PART 2: NCR (Non-Conformance Report) Enhancement
-- ========================================

-- Add NCR-specific columns to issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS ncr_number TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS issue_type TEXT DEFAULT 'general' CHECK (issue_type IN ('general', 'ncr', 'quality', 'safety', 'maintenance'));
ALTER TABLE issues ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS corrective_action TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS preventive_action TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS ncr_category TEXT CHECK (ncr_category IN ('material', 'process', 'equipment', 'design', 'supplier', 'documentation', 'other'));
ALTER TABLE issues ADD COLUMN IF NOT EXISTS affected_quantity INTEGER;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS disposition TEXT CHECK (disposition IN ('use_as_is', 'rework', 'repair', 'scrap', 'return_to_supplier'));
ALTER TABLE issues ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT false;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS verified_by_id UUID REFERENCES profiles(id);

-- Add unique constraint for NCR numbers (within tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_ncr_number_unique ON issues (tenant_id, ncr_number) WHERE ncr_number IS NOT NULL;

-- Create index for NCR filtering
CREATE INDEX IF NOT EXISTS idx_issues_ncr_type ON issues (tenant_id, issue_type) WHERE issue_type = 'ncr';

-- ========================================
-- PART 3: Job/Operation Lifecycle Tracking
-- ========================================

-- Add lifecycle tracking columns to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_duration INTEGER; -- in minutes

-- Add lifecycle tracking columns to operations
ALTER TABLE operations ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

-- Add lifecycle tracking columns to parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ========================================
-- PART 4: Enhanced Webhook Event Tracking
-- ========================================

-- Expand webhook events array to support new lifecycle events
-- (No schema change needed - events column already supports TEXT[])

-- Add index for webhook event filtering
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs (event_type, created_at DESC);

-- ========================================
-- PART 5: Comments and Documentation
-- ========================================

-- Jobs lifecycle
COMMENT ON COLUMN jobs.started_at IS 'Timestamp when the job was first started';
COMMENT ON COLUMN jobs.completed_at IS 'Timestamp when the job was completed';
COMMENT ON COLUMN jobs.paused_at IS 'Timestamp when the job was last paused';
COMMENT ON COLUMN jobs.resumed_at IS 'Timestamp when the job was last resumed';
COMMENT ON COLUMN jobs.actual_duration IS 'Actual duration of the job in minutes';

-- Operations lifecycle
COMMENT ON COLUMN operations.started_at IS 'Timestamp when the operation was first started';
COMMENT ON COLUMN operations.paused_at IS 'Timestamp when the operation was last paused';
COMMENT ON COLUMN operations.resumed_at IS 'Timestamp when the operation was last resumed';

-- Parts lifecycle
COMMENT ON COLUMN parts.started_at IS 'Timestamp when work on the part started';
COMMENT ON COLUMN parts.completed_at IS 'Timestamp when the part was completed';

-- NCR fields
COMMENT ON COLUMN issues.ncr_number IS 'Unique NCR number for non-conformance reports';
COMMENT ON COLUMN issues.issue_type IS 'Type of issue: general, ncr, quality, safety, maintenance';
COMMENT ON COLUMN issues.root_cause IS 'Root cause analysis of the issue';
COMMENT ON COLUMN issues.corrective_action IS 'Immediate corrective action taken';
COMMENT ON COLUMN issues.preventive_action IS 'Preventive action to avoid recurrence';
COMMENT ON COLUMN issues.ncr_category IS 'Category of NCR: material, process, equipment, design, supplier, documentation, other';
COMMENT ON COLUMN issues.affected_quantity IS 'Quantity of parts affected by the NCR';
COMMENT ON COLUMN issues.disposition IS 'Disposition of affected parts: use_as_is, rework, repair, scrap, return_to_supplier';
COMMENT ON COLUMN issues.verification_required IS 'Whether verification is required after corrective action';
COMMENT ON COLUMN issues.verified_at IS 'Timestamp when the corrective action was verified';
COMMENT ON COLUMN issues.verified_by_id IS 'User who verified the corrective action';

-- ========================================
-- PART 6: Helper Functions
-- ========================================

-- Function to generate NCR numbers
CREATE OR REPLACE FUNCTION generate_ncr_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_ncr_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get count of NCRs for this tenant in current year
  SELECT COUNT(*) + 1 INTO v_count
  FROM issues
  WHERE tenant_id = p_tenant_id
    AND issue_type = 'ncr'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Generate NCR number in format: NCR-YYYY-0001
  v_ncr_number := 'NCR-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_ncr_number;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 7: Update existing data (if needed)
-- ========================================

-- Set default issue_type for existing issues
UPDATE issues SET issue_type = 'general' WHERE issue_type IS NULL;
