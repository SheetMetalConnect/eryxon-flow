-- Rename stages to cells
ALTER TABLE stages RENAME TO cells;

-- Rename tasks to operations
ALTER TABLE tasks RENAME TO operations;

-- Update foreign key column names in jobs table
ALTER TABLE jobs RENAME COLUMN current_stage_id TO current_cell_id;

-- Update foreign key column names in parts table
ALTER TABLE parts RENAME COLUMN current_stage_id TO current_cell_id;

-- Update foreign key column names in operations table (formerly tasks)
ALTER TABLE operations RENAME COLUMN stage_id TO cell_id;

-- Update foreign key column names in time_entries table
ALTER TABLE time_entries RENAME COLUMN task_id TO operation_id;

-- Update foreign key column names in issues table
ALTER TABLE issues RENAME COLUMN task_id TO operation_id;

-- Rename column in operations for consistency
ALTER TABLE operations RENAME COLUMN task_name TO operation_name;

-- Create substeps table
CREATE TABLE substeps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  name text NOT NULL,
  sequence integer NOT NULL,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  notes text,
  completed_at timestamp with time zone,
  completed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on substeps
ALTER TABLE substeps ENABLE ROW LEVEL SECURITY;

-- RLS policies for substeps
CREATE POLICY "Admins can manage substeps in their tenant"
ON substeps
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

CREATE POLICY "Operators can update substeps for their operations"
ON substeps
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id() AND
  operation_id IN (
    SELECT id FROM operations 
    WHERE assigned_operator_id = auth.uid()
  )
);

CREATE POLICY "Users can view substeps in their tenant"
ON substeps
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Create indexes for substeps
CREATE INDEX idx_substeps_tenant_id ON substeps(tenant_id);
CREATE INDEX idx_substeps_operation_id ON substeps(operation_id);
CREATE INDEX idx_substeps_status ON substeps(status);

-- Update indexes for renamed tables
CREATE INDEX IF NOT EXISTS idx_operations_tenant_id ON operations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operations_part_id ON operations(part_id);
CREATE INDEX IF NOT EXISTS idx_operations_cell_id ON operations(cell_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_assigned_operator_id ON operations(assigned_operator_id);

CREATE INDEX IF NOT EXISTS idx_cells_tenant_id ON cells(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cells_sequence ON cells(sequence);