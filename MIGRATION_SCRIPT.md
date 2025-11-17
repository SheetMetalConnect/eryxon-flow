# Database Migration Script - Complete Setup

**Generated:** 2025-11-17  
**Purpose:** Complete database setup for production deployment  
**Migrations Included:** 25 migration files in chronological order

## How to Use

### Option 1: Using Supabase CLI (Recommended)
```bash
# Apply all migrations in order
supabase db push
```

### Option 2: Manual SQL Execution
Run the SQL scripts below in order from 1-25 in your Supabase SQL editor.

---

## Migration Files (In Order)


### Migration 1: 20251109191500_c0fc1063-1207-4d07-aefb-f25754cca416.sql

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('operator', 'admin');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'completed', 'on_hold');

-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('not_started', 'in_progress', 'completed', 'on_hold');

-- Create enum for issue severity
CREATE TYPE public.issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for issue status
CREATE TYPE public.issue_status AS ENUM ('pending', 'approved', 'rejected', 'closed');

-- Create enum for assignment status
CREATE TYPE public.assignment_status AS ENUM ('assigned', 'accepted', 'in_progress', 'completed');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  active BOOLEAN DEFAULT true,
  is_machine BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Stages table
CREATE TABLE public.stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  image_url TEXT,
  sequence INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  job_number TEXT NOT NULL,
  customer TEXT,
  due_date TIMESTAMPTZ,
  due_date_override TIMESTAMPTZ,
  status job_status DEFAULT 'not_started',
  current_stage_id UUID REFERENCES stages(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, job_number)
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Parts table
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  parent_part_id UUID REFERENCES parts(id),
  part_number TEXT NOT NULL,
  material TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  status job_status DEFAULT 'not_started',
  current_stage_id UUID REFERENCES stages(id),
  file_paths TEXT[],
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, part_number)
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id),
  assigned_operator_id UUID REFERENCES profiles(id),
  task_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  estimated_time INTEGER NOT NULL,
  actual_time INTEGER DEFAULT 0,
  status task_status DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  operator_id UUID NOT NULL REFERENCES profiles(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  description TEXT NOT NULL,
  severity issue_severity NOT NULL,
  status issue_status DEFAULT 'pending',
  image_paths TEXT[],
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  operator_id UUID NOT NULL REFERENCES profiles(id),
  part_id UUID REFERENCES parts(id),
  job_id UUID REFERENCES jobs(id),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  status assignment_status DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_parts_tenant ON parts(tenant_id);
CREATE INDEX idx_parts_job ON parts(job_id);
CREATE INDEX idx_parts_parent ON parts(parent_part_id);
CREATE INDEX idx_parts_material ON parts(material);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_part ON tasks(part_id);
CREATE INDEX idx_tasks_stage ON tasks(stage_id);
CREATE INDEX idx_tasks_operator ON tasks(assigned_operator_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_operator ON time_entries(operator_id);
CREATE INDEX idx_time_entries_active ON time_entries(end_time) WHERE end_time IS NULL;
CREATE INDEX idx_issues_tenant ON issues(tenant_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_assignments_operator ON assignments(operator_id);

-- Security definer function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Security definer function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their tenant"
  ON public.profiles FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage profiles in their tenant"
  ON public.profiles FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for stages
CREATE POLICY "Users can view stages in their tenant"
  ON public.stages FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage stages in their tenant"
  ON public.stages FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for jobs
CREATE POLICY "Users can view jobs in their tenant"
  ON public.jobs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage jobs in their tenant"
  ON public.jobs FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for parts
CREATE POLICY "Users can view parts in their tenant"
  ON public.parts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage parts in their tenant"
  ON public.parts FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their tenant"
  ON public.tasks FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Operators can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND assigned_operator_id = auth.uid());

CREATE POLICY "Admins can manage tasks in their tenant"
  ON public.tasks FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for time_entries
CREATE POLICY "Users can view time entries in their tenant"
  ON public.time_entries FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Operators can manage their own time entries"
  ON public.time_entries FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND operator_id = auth.uid());

CREATE POLICY "Admins can view all time entries in their tenant"
  ON public.time_entries FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for issues
CREATE POLICY "Users can view issues in their tenant"
  ON public.issues FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Operators can create issues"
  ON public.issues FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Admins can manage issues in their tenant"
  ON public.issues FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- RLS Policies for assignments
CREATE POLICY "Users can view assignments in their tenant"
  ON public.assignments FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Operators can update their own assignments"
  ON public.assignments FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND operator_id = auth.uid());

CREATE POLICY "Admins can manage assignments in their tenant"
  ON public.assignments FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, tenant_id, username, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', gen_random_uuid()::text)::uuid,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')::app_role
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE issues;
ALTER PUBLICATION supabase_realtime ADD TABLE parts;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
```

---


### Migration 2: 20251109192458_ce40a93c-12e0-4e8c-b9f9-6218aba01d42.sql

```sql
-- Remove placeholder profiles (they won't work without auth.users entries)
DELETE FROM public.profiles WHERE tenant_id = '11111111-1111-1111-1111-111111111111'::uuid;

-- The seed data is ready with:
-- - 3 Stages (Cutting, Bending, Welding) 
-- - 5 Jobs with 10 Parts
-- - 30 Tasks across various stages and materials
--
-- To use this seed data:
-- 1. Sign up with any email to create your admin account
-- 2. After signup, run this SQL to connect to the demo tenant:
--
--    UPDATE profiles 
--    SET tenant_id = '11111111-1111-1111-1111-111111111111'::uuid,
--        role = 'admin'
--    WHERE id = auth.uid();
--
-- 3. Refresh the page - you'll now see all the seed data!
-- 4. Create additional operators through the Config > Users page
```

---


### Migration 3: 20251109192725_c2747409-aa27-4c9b-939d-5c6aaedfc71c.sql

```sql
-- Fix username constraint to be tenant-scoped instead of global
-- This allows multiple tenants to have the same username

-- Drop the global unique constraint on username
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Add a composite unique constraint on (tenant_id, username)
-- This ensures username is unique within each tenant, but not globally
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tenant_username_key 
  UNIQUE (tenant_id, username);

-- Now multiple tenants can have "admin", "office", etc. as usernames
```

---


### Migration 4: 20251110123752_2ca081b0-6e82-42c1-9114-8b0777450b41.sql

```sql
-- Create API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret_key TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_logs table for tracking deliveries
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Admins can manage API keys in their tenant"
  ON public.api_keys
  FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin'::app_role);

-- RLS Policies for webhooks
CREATE POLICY "Admins can manage webhooks in their tenant"
  ON public.webhooks
  FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin'::app_role);

-- RLS Policies for webhook_logs
CREATE POLICY "Admins can view webhook logs in their tenant"
  ON public.webhook_logs
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.webhooks WHERE tenant_id = get_user_tenant_id()
    ) AND get_user_role() = 'admin'::app_role
  );

-- Indexes for performance
CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE active = true;
CREATE INDEX idx_webhooks_tenant ON public.webhooks(tenant_id);
CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);
```

---


### Migration 5: 20251112203610_003b74a8-bd56-47a0-b2c4-9aa08919e5b3.sql

```sql
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
```

---


### Migration 6: 20251112211221_54c59dcf-3740-4ee3-a622-9ed4ab166e06.sql

```sql
-- Clear all data except tenant information (profiles table)
-- Delete in correct order to respect foreign key constraints

DELETE FROM webhook_logs;
DELETE FROM time_entries;
DELETE FROM substeps;
DELETE FROM issues;
DELETE FROM assignments;
DELETE FROM operations;
DELETE FROM parts;
DELETE FROM jobs;
DELETE FROM webhooks;
DELETE FROM api_keys;
DELETE FROM cells;

-- Profiles table is preserved to keep tenant information
```

---


### Migration 7: 20251112230000_update_realtime_publications.sql

```sql
-- Update realtime publications for renamed tables
-- Since tasks was renamed to operations, update the publication

-- Remove old tasks table from realtime (it no longer exists)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS tasks;

-- Add operations table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE operations;

-- Ensure other tables are also in realtime
-- These may already exist, but IF NOT EXISTS isn't available for publications
-- So we use a different approach: drop and re-add

-- Note: The DROP TABLE IF EXISTS is safe and won't error if table isn't in publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS cells;
ALTER PUBLICATION supabase_realtime ADD TABLE cells;

```

---


### Migration 8: 20251113061547_99ea6f9d-365a-4aa6-b608-a2aa94fc3e15.sql

```sql
-- Create storage bucket for CAD/STEP files
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-cad', 'parts-cad', false);

-- RLS Policy: Allow authenticated users to upload files to their tenant folder
CREATE POLICY "Users can upload CAD files to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-cad' 
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to read files from their tenant folder
CREATE POLICY "Users can view CAD files from their tenant folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'parts-cad'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to delete files from their tenant folder
CREATE POLICY "Users can delete CAD files from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-cad'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);
```

---


### Migration 9: 20251117000000_add_pause_functionality.sql

```sql
-- Add pause tracking for time entries
CREATE TABLE IF NOT EXISTS public.time_entry_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  duration INTEGER, -- Duration of pause in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_entry_pauses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entry_pauses
CREATE POLICY "Users can view their own pauses"
  ON public.time_entry_pauses
  FOR SELECT
  USING (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own pauses"
  ON public.time_entry_pauses
  FOR INSERT
  WITH CHECK (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own pauses"
  ON public.time_entry_pauses
  FOR UPDATE
  USING (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

-- Add is_paused flag to time_entries for quick lookup
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_time_entry_id
  ON public.time_entry_pauses(time_entry_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_resumed_at
  ON public.time_entry_pauses(resumed_at)
  WHERE resumed_at IS NULL;

```

---


### Migration 10: 20251117120000_add_tenants_and_subscriptions.sql

```sql
-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'premium');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'suspended', 'trial');

-- Tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  -- Plan limits
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  -- Usage tracking
  current_month_parts INTEGER DEFAULT 0,
  current_storage_mb INTEGER DEFAULT 0,
  -- Subscription metadata
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  -- Enterprise features
  sso_enabled BOOLEAN DEFAULT false,
  self_hosted BOOLEAN DEFAULT false,
  -- Contact information
  contact_email TEXT,
  billing_email TEXT,
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Add index for tenant lookups
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Update profiles to reference tenants table
-- Note: This doesn't add a foreign key constraint to avoid breaking existing data
-- In production, you would migrate existing tenant_ids to the tenants table first

-- Function to get tenant subscription info
CREATE OR REPLACE FUNCTION public.get_tenant_subscription(tenant_uuid UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  plan subscription_plan,
  status subscription_status,
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  current_month_parts INTEGER,
  current_storage_mb INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    name,
    plan,
    status,
    max_jobs,
    max_parts_per_month,
    max_storage_gb,
    current_month_parts,
    current_storage_mb
  FROM public.tenants
  WHERE id = tenant_uuid;
$$;

-- Function to get current user's tenant subscription
CREATE OR REPLACE FUNCTION public.get_my_tenant_subscription()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  plan subscription_plan,
  status subscription_status,
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  current_month_parts INTEGER,
  current_storage_mb INTEGER,
  plan_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.plan,
    t.status,
    t.max_jobs,
    t.max_parts_per_month,
    t.max_storage_gb,
    t.current_month_parts,
    t.current_storage_mb,
    t.plan_started_at,
    t.trial_ends_at
  FROM public.tenants t
  INNER JOIN public.profiles p ON p.tenant_id = t.id
  WHERE p.id = auth.uid();
$$;

-- Function to get tenant usage statistics
-- Security: Only returns stats for the calling user's tenant (no parameter to prevent cross-tenant access)
CREATE OR REPLACE FUNCTION public.get_tenant_usage_stats()
RETURNS TABLE (
  total_jobs BIGINT,
  total_parts BIGINT,
  active_jobs BIGINT,
  completed_jobs BIGINT,
  current_month_parts BIGINT,
  total_operators BIGINT,
  total_admins BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT p.id) as total_parts,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'in_progress') as active_jobs,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
    COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= date_trunc('month', CURRENT_DATE)) as current_month_parts,
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'operator') as total_operators,
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'admin') as total_admins
  FROM public.jobs j
  LEFT JOIN public.parts p ON p.job_id = j.id
  LEFT JOIN public.profiles pr ON pr.tenant_id = public.get_user_tenant_id()
  WHERE j.tenant_id = public.get_user_tenant_id() OR p.tenant_id = public.get_user_tenant_id();
$$;

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update their tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- Insert default tenant data for existing tenant_ids in profiles
-- This creates a tenant record for each unique tenant_id
INSERT INTO public.tenants (id, name, plan, status, max_jobs, max_parts_per_month, max_storage_gb)
SELECT DISTINCT
  p.tenant_id,
  'Tenant ' || substring(p.tenant_id::text, 1, 8),
  'free',
  'active',
  100,
  1000,
  5
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenants t WHERE t.id = p.tenant_id
)
ON CONFLICT (id) DO NOTHING;

-- Function to initialize new tenant on user creation
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    -- Create new tenant with free plan defaults
    INSERT INTO public.tenants (
      id,
      name,
      plan,
      status,
      max_jobs,
      max_parts_per_month,
      max_storage_gb,
      contact_email
    ) VALUES (
      NEW.tenant_id,
      COALESCE(NEW.full_name || '''s Organization', 'New Organization'),
      'free',
      'active',
      100,
      1000,
      5,
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to create tenant when new profile is created
CREATE TRIGGER on_profile_created_create_tenant
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

```

---


### Migration 11: 20251117153200_add_materials_table.sql

```sql
-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create index for faster lookups
CREATE INDEX idx_materials_tenant_id ON materials(tenant_id);
CREATE INDEX idx_materials_active ON materials(tenant_id, active);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view materials in their tenant"
  ON materials FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can insert materials"
  ON materials FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update materials"
  ON materials FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete materials"
  ON materials FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing materials from parts table
INSERT INTO materials (tenant_id, name, active)
SELECT DISTINCT
  p.tenant_id,
  p.material,
  true
FROM parts p
WHERE p.material IS NOT NULL
  AND p.material != ''
  AND NOT EXISTS (
    SELECT 1 FROM materials m
    WHERE m.tenant_id = p.tenant_id
    AND m.name = p.material
  )
ORDER BY p.tenant_id, p.material;

```

---


### Migration 12: 20251117153634_add_resources_system.sql

```sql
-- Create resources table for reusable resources (tooling, fixtures, molds, etc.)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'tooling', 'fixture', 'mold', 'material', 'other'
  description TEXT,
  identifier TEXT, -- Serial number, part number, or other identifier
  location TEXT, -- Storage location
  status TEXT DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'retired'
  metadata JSONB, -- Custom fields for specific resource types
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create operation_resources junction table to link operations to required resources
CREATE TABLE IF NOT EXISTS operation_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) DEFAULT 1, -- How many of this resource are needed
  notes TEXT, -- Special instructions for this resource on this operation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(operation_id, resource_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_resources_tenant_id ON resources(tenant_id);
CREATE INDEX idx_resources_type ON resources(tenant_id, type);
CREATE INDEX idx_resources_status ON resources(tenant_id, status);
CREATE INDEX idx_operation_resources_operation_id ON operation_resources(operation_id);
CREATE INDEX idx_operation_resources_resource_id ON operation_resources(resource_id);

-- Enable RLS on resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
CREATE POLICY "Users can view resources in their tenant"
  ON resources FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can insert resources"
  ON resources FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on operation_resources
ALTER TABLE operation_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operation_resources
CREATE POLICY "Users can view operation_resources in their tenant"
  ON operation_resources FOR SELECT
  USING (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

CREATE POLICY "Admins can insert operation_resources"
  ON operation_resources FOR INSERT
  WITH CHECK (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

CREATE POLICY "Admins can update operation_resources"
  ON operation_resources FOR UPDATE
  USING (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

CREATE POLICY "Admins can delete operation_resources"
  ON operation_resources FOR DELETE
  USING (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

-- Add updated_at trigger for resources
CREATE TRIGGER set_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

```

---


### Migration 13: 20251117160437_78a19ced-6a67-4496-add3-b64bba24c713.sql

```sql
-- Fix existing migrations and add all required tables

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON public.materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(tenant_id, active);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for materials
DROP POLICY IF EXISTS "Users can view materials in their tenant" ON public.materials;
CREATE POLICY "Users can view materials in their tenant"
  ON public.materials FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials"
  ON public.materials FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- Create resources table for reusable resources (tooling, fixtures, molds, etc.)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  identifier TEXT,
  location TEXT,
  status TEXT DEFAULT 'available',
  metadata JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create operation_resources junction table
CREATE TABLE IF NOT EXISTS public.operation_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(operation_id, resource_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_tenant_id ON public.resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_operation_resources_operation_id ON public.operation_resources(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_resources_resource_id ON public.operation_resources(resource_id);

-- Enable RLS on resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
DROP POLICY IF EXISTS "Users can view resources in their tenant" ON public.resources;
CREATE POLICY "Users can view resources in their tenant"
  ON public.resources FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- Enable RLS on operation_resources
ALTER TABLE public.operation_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operation_resources
DROP POLICY IF EXISTS "Users can view operation_resources in their tenant" ON public.operation_resources;
CREATE POLICY "Users can view operation_resources in their tenant"
  ON public.operation_resources FOR SELECT
  USING (
    operation_id IN (
      SELECT id FROM operations WHERE tenant_id = get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Admins can manage operation_resources" ON public.operation_resources;
CREATE POLICY "Admins can manage operation_resources"
  ON public.operation_resources FOR ALL
  USING (
    operation_id IN (
      SELECT id FROM operations WHERE tenant_id = get_user_tenant_id()
    ) AND get_user_role() = 'admin'
  );

-- Add pause tracking for time entries
CREATE TABLE IF NOT EXISTS public.time_entry_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_entry_pauses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entry_pauses
DROP POLICY IF EXISTS "Users can manage their own pauses" ON public.time_entry_pauses;
CREATE POLICY "Users can manage their own pauses"
  ON public.time_entry_pauses FOR ALL
  USING (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

-- Add is_paused flag to time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_time_entry_id
  ON public.time_entry_pauses(time_entry_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_resumed_at
  ON public.time_entry_pauses(resumed_at)
  WHERE resumed_at IS NULL;

-- Migrate existing materials from parts table
INSERT INTO public.materials (tenant_id, name, active)
SELECT DISTINCT
  p.tenant_id,
  p.material,
  true
FROM public.parts p
WHERE p.material IS NOT NULL
  AND p.material != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.materials m
    WHERE m.tenant_id = p.tenant_id
    AND m.name = p.material
  )
ON CONFLICT (tenant_id, name) DO NOTHING;
```

---


### Migration 14: 20251117162904_eb685d70-ce81-4de6-ac8c-1009e5dbff1f.sql

```sql
-- Add onboarding tracking fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mock_data_imported BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups on onboarding status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON public.profiles(onboarding_completed);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indicates if user has completed the onboarding wizard';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current step in onboarding wizard (0 = not started)';
COMMENT ON COLUMN public.profiles.tour_completed IS 'Indicates if user has completed the app tour';
COMMENT ON COLUMN public.profiles.mock_data_imported IS 'Indicates if mock data has been imported for this user';
```

---


### Migration 15: 20251117165529_8c060f7b-c830-4402-89d8-30d8d9dea6a2.sql

```sql
-- Add onboarding tracking fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mock_data_imported BOOLEAN DEFAULT FALSE;
```

---


### Migration 16: 20251117170000_add_onboarding_tracking.sql

```sql
-- Add onboarding tracking fields to profiles table
-- Note: plan is stored in tenants table, not here
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mock_data_imported BOOLEAN DEFAULT FALSE;

-- Add comments to explain the fields
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding wizard';
COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in onboarding wizard (0 = not started)';
COMMENT ON COLUMN profiles.tour_completed IS 'Whether user has completed the guided tour';
COMMENT ON COLUMN profiles.mock_data_imported IS 'Whether user has imported mock data during onboarding';

```

---


### Migration 17: 20251117174319_8ef714ee-3295-4410-aea0-fa3f3ed16bd6.sql

```sql
-- Add reset tracking to tenants table (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tenants' AND column_name = 'last_parts_reset_date') THEN
    ALTER TABLE public.tenants ADD COLUMN last_parts_reset_date timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Create monthly_reset_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.monthly_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reset_date timestamp with time zone NOT NULL DEFAULT now(),
  previous_count integer NOT NULL,
  reset_successful boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on monthly_reset_logs
ALTER TABLE public.monthly_reset_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only
CREATE POLICY "Service role can manage reset logs" ON public.monthly_reset_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to reset monthly parts counters
CREATE OR REPLACE FUNCTION public.reset_monthly_parts_counters()
RETURNS TABLE(tenant_id uuid, previous_count integer, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH reset_data AS (
    UPDATE public.tenants
    SET 
      current_parts_this_month = 0,
      last_parts_reset_date = now()
    WHERE status = 'active'
    RETURNING id, current_parts_this_month as prev_count
  )
  INSERT INTO public.monthly_reset_logs (tenant_id, reset_date, previous_count, reset_successful)
  SELECT id, now(), prev_count, true
  FROM reset_data
  RETURNING monthly_reset_logs.tenant_id, monthly_reset_logs.previous_count, 
            monthly_reset_logs.reset_successful, 'Reset successful'::text;
END;
$$;

-- Create helper functions for checking limits
CREATE OR REPLACE FUNCTION public.can_create_job(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_jobs integer;
  v_max_jobs integer;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- NULL max_jobs means unlimited
  IF v_max_jobs IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_current_jobs < v_max_jobs;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_parts(p_tenant_id uuid, p_quantity integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_parts integer;
  v_max_parts integer;
BEGIN
  SELECT current_parts_this_month, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- NULL max_parts means unlimited
  IF v_max_parts IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_quota(p_tenant_id uuid)
RETURNS TABLE(
  current_jobs integer,
  max_jobs integer,
  current_parts integer,
  max_parts integer,
  current_storage numeric,
  max_storage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.current_jobs,
    t.max_jobs,
    t.current_parts_this_month,
    t.max_parts_per_month,
    t.current_storage_gb,
    t.max_storage_gb
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$;

-- Create trigger function to increment job count
CREATE OR REPLACE FUNCTION public.trigger_increment_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = COALESCE(current_jobs, 0) + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Create trigger function to decrement job count
CREATE OR REPLACE FUNCTION public.trigger_decrement_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(COALESCE(current_jobs, 0) - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;

-- Create trigger function to increment parts count
CREATE OR REPLACE FUNCTION public.trigger_increment_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = COALESCE(current_parts_this_month, 0) + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Create trigger function to decrement parts count
CREATE OR REPLACE FUNCTION public.trigger_decrement_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = GREATEST(COALESCE(current_parts_this_month, 0) - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;

-- Create triggers on jobs table
DROP TRIGGER IF EXISTS jobs_increment_count ON public.jobs;
CREATE TRIGGER jobs_increment_count
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_increment_jobs();

DROP TRIGGER IF EXISTS jobs_decrement_count ON public.jobs;
CREATE TRIGGER jobs_decrement_count
  AFTER DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_decrement_jobs();

-- Create triggers on parts table
DROP TRIGGER IF EXISTS parts_increment_count ON public.parts;
CREATE TRIGGER parts_increment_count
  AFTER INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_increment_parts();

DROP TRIGGER IF EXISTS parts_decrement_count ON public.parts;
CREATE TRIGGER parts_decrement_count
  AFTER DELETE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_decrement_parts();
```

---


### Migration 18: 20251117174347_b8007d40-c345-4812-a5d6-aff0100c719f.sql

```sql
-- Fix search_path security warnings for all functions

-- Update reset_monthly_parts_counters function
CREATE OR REPLACE FUNCTION public.reset_monthly_parts_counters()
RETURNS TABLE(tenant_id uuid, previous_count integer, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH reset_data AS (
    UPDATE public.tenants
    SET 
      current_parts_this_month = 0,
      last_parts_reset_date = now()
    WHERE status = 'active'
    RETURNING id, current_parts_this_month as prev_count
  )
  INSERT INTO public.monthly_reset_logs (tenant_id, reset_date, previous_count, reset_successful)
  SELECT id, now(), prev_count, true
  FROM reset_data
  RETURNING monthly_reset_logs.tenant_id, monthly_reset_logs.previous_count, 
            monthly_reset_logs.reset_successful, 'Reset successful'::text;
END;
$$;

-- Update can_create_job function
CREATE OR REPLACE FUNCTION public.can_create_job(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_jobs integer;
  v_max_jobs integer;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_max_jobs IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_current_jobs < v_max_jobs;
END;
$$;

-- Update can_create_parts function
CREATE OR REPLACE FUNCTION public.can_create_parts(p_tenant_id uuid, p_quantity integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_parts integer;
  v_max_parts integer;
BEGIN
  SELECT current_parts_this_month, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_max_parts IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$;

-- Update get_tenant_quota function
CREATE OR REPLACE FUNCTION public.get_tenant_quota(p_tenant_id uuid)
RETURNS TABLE(
  current_jobs integer,
  max_jobs integer,
  current_parts integer,
  max_parts integer,
  current_storage numeric,
  max_storage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.current_jobs,
    t.max_jobs,
    t.current_parts_this_month,
    t.max_parts_per_month,
    t.current_storage_gb,
    t.max_storage_gb
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$;

-- Update trigger_increment_jobs function
CREATE OR REPLACE FUNCTION public.trigger_increment_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = COALESCE(current_jobs, 0) + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Update trigger_decrement_jobs function
CREATE OR REPLACE FUNCTION public.trigger_decrement_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(COALESCE(current_jobs, 0) - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;

-- Update trigger_increment_parts function
CREATE OR REPLACE FUNCTION public.trigger_increment_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = COALESCE(current_parts_this_month, 0) + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Update trigger_decrement_parts function
CREATE OR REPLACE FUNCTION public.trigger_decrement_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = GREATEST(COALESCE(current_parts_this_month, 0) - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;
```

---


### Migration 19: 20251117174450_c52da867-f80a-44cf-8797-54cb4d0b3c20.sql

```sql
-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

---


### Migration 20: 20251117174506_3cd88d26-53e5-4f85-8e34-68bed96c41ce.sql

```sql
-- Store credentials in Vault for cron job authentication
SELECT vault.create_secret('https://vatgianzotsurljznsry.supabase.co', 'project_url');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGdpYW56b3RzdXJsanpuc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTA2MDksImV4cCI6MjA3ODI2NjYwOX0.7AjzaZjAMcygsMiPbI8w43F00JDU6hlpOWlbejOAZS0', 'anon_key');

-- Schedule monthly parts counter reset (runs at midnight on 1st of each month)
SELECT cron.schedule(
  'monthly-parts-counter-reset',
  '0 0 1 * *', -- At 00:00 on day 1 of every month
  $$
  SELECT
    net.http_post(
        url:= (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/monthly-reset-cron',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
        ),
        body:=jsonb_build_object('triggered_at', now())
    ) as request_id;
  $$
);
```

---


### Migration 21: 20251117180000_usage_tracking_and_plan_limits.sql

```sql
-- Migration: Usage Tracking, Plan Limits Enforcement, and Monthly Reset
-- Created: 2025-11-17
-- Description:
--   1. Add tracking fields for monthly resets and current jobs
--   2. Create monthly_reset_logs table for audit trail
--   3. Update plan limits to match new pricing (Pro: 1000 jobs, 10000 parts)
--   4. Create triggers for automatic usage tracking
--   5. Create function for monthly parts counter reset

-- ============================================================================
-- STEP 1: Add new fields to tenants table
-- ============================================================================

-- Add last_parts_reset_date to track when parts counter was last reset
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS last_parts_reset_date TIMESTAMPTZ DEFAULT NOW();

-- Add current_jobs to track total jobs (not monthly, cumulative)
-- Note: current_month_parts already exists, we're keeping it
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS current_jobs INTEGER DEFAULT 0;

-- Update existing tenants to have a reset date (if null)
UPDATE public.tenants
SET last_parts_reset_date = COALESCE(last_parts_reset_date, NOW())
WHERE last_parts_reset_date IS NULL;

-- ============================================================================
-- STEP 2: Create monthly_reset_logs table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monthly_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_parts_count INTEGER NOT NULL DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  reset_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic' or 'manual'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries on tenant_id and reset_date
CREATE INDEX IF NOT EXISTS idx_reset_logs_tenant_date
ON public.monthly_reset_logs(tenant_id, reset_date DESC);

-- Enable RLS on monthly_reset_logs
ALTER TABLE public.monthly_reset_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's reset logs
CREATE POLICY "Users can view their tenant reset logs"
  ON public.monthly_reset_logs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Policy: Only service role can insert reset logs (via cron job)
-- Note: This will be handled by the edge function with service role key

-- ============================================================================
-- STEP 3: Update plan limits to match new pricing
-- ============================================================================

-- Update Pro plan limits to 1000 jobs/month and 10000 parts/month
UPDATE public.tenants
SET
  max_jobs = 1000,
  max_parts_per_month = 10000
WHERE plan = 'pro';

-- Update Premium/Enterprise plan to unlimited (NULL means unlimited)
UPDATE public.tenants
SET
  max_jobs = NULL,
  max_parts_per_month = NULL,
  max_storage_gb = NULL
WHERE plan = 'premium';

-- Ensure Free plan has correct limits (100 jobs, 1000 parts, 5GB)
UPDATE public.tenants
SET
  max_jobs = 100,
  max_parts_per_month = 1000,
  max_storage_gb = 5
WHERE plan = 'free';

-- ============================================================================
-- STEP 4: Create triggers for automatic usage tracking
-- ============================================================================

-- Function: Update current_jobs count when jobs are created
CREATE OR REPLACE FUNCTION public.increment_tenant_jobs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = current_jobs + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrement current_jobs count when jobs are deleted
CREATE OR REPLACE FUNCTION public.decrement_tenant_jobs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(current_jobs - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update current_month_parts when parts are created
CREATE OR REPLACE FUNCTION public.increment_tenant_parts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_month_parts = current_month_parts + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrement current_month_parts when parts are deleted
CREATE OR REPLACE FUNCTION public.decrement_tenant_parts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenants
  SET current_month_parts = GREATEST(current_month_parts - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop triggers if they exist (to avoid conflicts on re-run)
DROP TRIGGER IF EXISTS trigger_increment_jobs ON public.jobs;
DROP TRIGGER IF EXISTS trigger_decrement_jobs ON public.jobs;
DROP TRIGGER IF EXISTS trigger_increment_parts ON public.parts;
DROP TRIGGER IF EXISTS trigger_decrement_parts ON public.parts;

-- Create triggers on jobs table
CREATE TRIGGER trigger_increment_jobs
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_tenant_jobs();

CREATE TRIGGER trigger_decrement_jobs
  AFTER DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_tenant_jobs();

-- Create triggers on parts table
CREATE TRIGGER trigger_increment_parts
  AFTER INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_tenant_parts();

CREATE TRIGGER trigger_decrement_parts
  AFTER DELETE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_tenant_parts();

-- ============================================================================
-- STEP 5: Create function for monthly parts counter reset
-- ============================================================================

-- Function: Reset monthly parts counter for all tenants
-- This will be called by the monthly cron job
CREATE OR REPLACE FUNCTION public.reset_monthly_parts_counters()
RETURNS TABLE(
  tenant_id UUID,
  previous_count INTEGER,
  reset_successful BOOLEAN
) AS $$
DECLARE
  tenant_record RECORD;
  billing_start DATE;
  billing_end DATE;
BEGIN
  -- Calculate billing period (previous month)
  billing_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  billing_end := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;

  -- Loop through all active tenants
  FOR tenant_record IN
    SELECT id, current_month_parts, plan, status
    FROM public.tenants
    WHERE status = 'active'
  LOOP
    -- Log the reset
    INSERT INTO public.monthly_reset_logs (
      tenant_id,
      previous_parts_count,
      billing_period_start,
      billing_period_end,
      reset_type,
      metadata
    ) VALUES (
      tenant_record.id,
      tenant_record.current_month_parts,
      billing_start,
      billing_end,
      'automatic',
      jsonb_build_object(
        'plan', tenant_record.plan,
        'reset_timestamp', NOW()
      )
    );

    -- Reset the counter
    UPDATE public.tenants
    SET
      current_month_parts = 0,
      last_parts_reset_date = NOW()
    WHERE id = tenant_record.id;

    -- Return result
    RETURN QUERY SELECT
      tenant_record.id,
      tenant_record.current_month_parts,
      TRUE;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.reset_monthly_parts_counters() TO service_role;

-- ============================================================================
-- STEP 6: Create helper function to check plan limits
-- ============================================================================

-- Function: Check if tenant can create more jobs
CREATE OR REPLACE FUNCTION public.can_create_job(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_jobs INTEGER;
  v_max_jobs INTEGER;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- If max_jobs is NULL, it's unlimited
  IF v_max_jobs IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if under limit
  RETURN v_current_jobs < v_max_jobs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if tenant can create more parts
CREATE OR REPLACE FUNCTION public.can_create_parts(p_tenant_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_parts INTEGER;
  v_max_parts INTEGER;
BEGIN
  SELECT current_month_parts, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- If max_parts_per_month is NULL, it's unlimited
  IF v_max_parts IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if under limit (including the new parts quantity)
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get remaining quota for tenant
CREATE OR REPLACE FUNCTION public.get_tenant_quota(p_tenant_id UUID)
RETURNS TABLE(
  plan subscription_plan,
  current_jobs INTEGER,
  max_jobs INTEGER,
  remaining_jobs INTEGER,
  current_parts INTEGER,
  max_parts INTEGER,
  remaining_parts INTEGER,
  can_create_job BOOLEAN,
  can_create_part BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.plan,
    t.current_jobs,
    t.max_jobs,
    CASE
      WHEN t.max_jobs IS NULL THEN -1 -- -1 means unlimited
      ELSE GREATEST(t.max_jobs - t.current_jobs, 0)
    END as remaining_jobs,
    t.current_month_parts,
    t.max_parts_per_month,
    CASE
      WHEN t.max_parts_per_month IS NULL THEN -1 -- -1 means unlimited
      ELSE GREATEST(t.max_parts_per_month - t.current_month_parts, 0)
    END as remaining_parts,
    public.can_create_job(p_tenant_id) as can_create_job,
    public.can_create_parts(p_tenant_id, 1) as can_create_part
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_create_job(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_parts(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_quota(UUID) TO authenticated, service_role;

-- ============================================================================
-- STEP 7: Initialize current_jobs count for existing tenants
-- ============================================================================

-- Update current_jobs to match actual count in jobs table
UPDATE public.tenants t
SET current_jobs = (
  SELECT COUNT(*)
  FROM public.jobs j
  WHERE j.tenant_id = t.id
);

-- Update current_month_parts to match actual count in parts table
-- (Only count parts created this month)
UPDATE public.tenants t
SET current_month_parts = (
  SELECT COALESCE(SUM(p.quantity), 0)
  FROM public.parts p
  WHERE p.tenant_id = t.id
    AND p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
);

-- ============================================================================
-- STEP 8: Update get_tenant_usage_stats function to use new counters
-- ============================================================================

-- Update the existing RPC function to use the new counters
CREATE OR REPLACE FUNCTION public.get_tenant_usage_stats()
RETURNS TABLE(
  total_jobs BIGINT,
  total_parts BIGINT,
  active_jobs BIGINT,
  completed_jobs BIGINT,
  current_month_parts BIGINT,
  total_operators BIGINT,
  total_admins BIGINT
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get current user's tenant ID
  v_tenant_id := public.get_user_tenant_id();

  RETURN QUERY
  SELECT
    -- Use current_jobs from tenants table
    (SELECT t.current_jobs::BIGINT FROM public.tenants t WHERE t.id = v_tenant_id) as total_jobs,

    -- Total parts across all time
    COUNT(DISTINCT p.id) as total_parts,

    -- Active jobs (not completed)
    COUNT(DISTINCT j.id) FILTER (WHERE j.status != 'completed') as active_jobs,

    -- Completed jobs
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,

    -- Use current_month_parts from tenants table (which is now auto-updated by triggers)
    (SELECT t.current_month_parts::BIGINT FROM public.tenants t WHERE t.id = v_tenant_id) as current_month_parts,

    -- Total operators
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'operator') as total_operators,

    -- Total admins
    COUNT(DISTINCT pr.id) FILTER (WHERE pr.role = 'admin') as total_admins
  FROM public.jobs j
  LEFT JOIN public.parts p ON p.job_id = j.id
  LEFT JOIN public.profiles pr ON pr.tenant_id = j.tenant_id
  WHERE j.tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- This migration sets up:
-- 1. Automatic usage tracking via database triggers
-- 2. Monthly reset capability via reset_monthly_parts_counters() function
-- 3. Plan limit checking via can_create_job() and can_create_parts() functions
-- 4. Audit trail via monthly_reset_logs table
-- 5. Updated plan limits (Free: 100/1000, Pro: 1000/10000, Enterprise: unlimited)
--
-- Next steps:
-- 1. Create Supabase edge function for monthly cron job
-- 2. Update API endpoints to check limits before creating jobs/parts
-- 3. Deploy and test the system
--
-- ============================================================================

```

---


### Migration 22: 20251117190000_create_parts_images_bucket.sql

```sql
-- Create storage bucket for part images
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-images', 'parts-images', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated users to upload images to their tenant folder
CREATE POLICY "Users can upload part images to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to read images from their tenant folder
CREATE POLICY "Users can view part images from their tenant folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to delete images from their tenant folder
CREATE POLICY "Users can delete part images from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

```

---


### Migration 23: 20251117200000_add_fulltext_search_indexes.sql

```sql
-- Add full-text search indexes for better search performance
-- This migration adds GIN indexes and tsvector columns for PostgreSQL full-text search

-- Add tsvector columns for full-text search on jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(job_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(customer, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) STORED;

-- Create GIN index on jobs search vector
CREATE INDEX IF NOT EXISTS idx_jobs_search_vector ON jobs USING GIN (search_vector);

-- Add tsvector columns for full-text search on parts table
ALTER TABLE parts ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(part_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(material, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) STORED;

-- Create GIN index on parts search vector
CREATE INDEX IF NOT EXISTS idx_parts_search_vector ON parts USING GIN (search_vector);

-- Add tsvector columns for full-text search on operations table
ALTER TABLE operations ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(operation_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) STORED;

-- Create GIN index on operations search vector
CREATE INDEX IF NOT EXISTS idx_operations_search_vector ON operations USING GIN (search_vector);

-- Add tsvector columns for full-text search on profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(email, '')), 'B')
  ) STORED;

-- Create GIN index on profiles search vector
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN (search_vector);

-- Add tsvector columns for full-text search on issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(resolution_notes, '')), 'B')
  ) STORED;

-- Create GIN index on issues search vector
CREATE INDEX IF NOT EXISTS idx_issues_search_vector ON issues USING GIN (search_vector);

-- Add additional indexes for common search patterns
-- These complement the existing indexes and improve search performance

-- Jobs: Additional index for combined job_number and customer search
CREATE INDEX IF NOT EXISTS idx_jobs_number_customer ON jobs (job_number, customer) WHERE tenant_id IS NOT NULL;

-- Parts: Additional index for combined part_number and material search
CREATE INDEX IF NOT EXISTS idx_parts_number_material ON parts (part_number, material) WHERE tenant_id IS NOT NULL;

-- Profiles: Additional index for email and username search
CREATE INDEX IF NOT EXISTS idx_profiles_email_username ON profiles (email, username) WHERE tenant_id IS NOT NULL;

-- Comment explaining the search indexes
COMMENT ON COLUMN jobs.search_vector IS 'Full-text search vector for jobs. Searches job_number (weight A), customer (weight A), and notes (weight B)';
COMMENT ON COLUMN parts.search_vector IS 'Full-text search vector for parts. Searches part_number (weight A), material (weight B), and notes (weight B)';
COMMENT ON COLUMN operations.search_vector IS 'Full-text search vector for operations. Searches operation_name (weight A) and notes (weight B)';
COMMENT ON COLUMN profiles.search_vector IS 'Full-text search vector for users. Searches full_name (weight A), username (weight A), and email (weight B)';
COMMENT ON COLUMN issues.search_vector IS 'Full-text search vector for issues. Searches description (weight A) and resolution_notes (weight B)';

```

---


### Migration 24: 20251117200001_create_notifications_system.sql

```sql
-- Create notifications table for interactive notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('issue', 'job_due', 'new_part', 'new_user', 'assignment', 'part_completed', 'operation_completed', 'system')),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,

  -- Reference to source entity
  reference_type TEXT CHECK (reference_type IN ('issue', 'job', 'part', 'user', 'assignment', 'operation')),
  reference_id UUID,

  -- Interactive states
  read BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for better query performance
CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_pinned ON public.notifications(pinned);
CREATE INDEX idx_notifications_dismissed ON public.notifications(dismissed);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_reference ON public.notifications(reference_type, reference_id);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only see notifications for their tenant and (if user_id is set) for themselves
CREATE POLICY "Users can view their tenant's notifications"
  ON public.notifications
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL OR user_id = auth.uid()
    )
  );

-- Users can insert notifications for their tenant
CREATE POLICY "Users can create notifications for their tenant"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read, pin, dismiss)
CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL OR user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON public.notifications
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to automatically create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_tenant_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    tenant_id,
    user_id,
    type,
    severity,
    title,
    message,
    link,
    reference_type,
    reference_id,
    metadata
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    p_type,
    p_severity,
    p_title,
    p_message,
    p_link,
    p_reference_type,
    p_reference_id,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;

-- Function to toggle notification pin
CREATE OR REPLACE FUNCTION public.toggle_notification_pin(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pinned BOOLEAN;
BEGIN
  UPDATE public.notifications
  SET
    pinned = NOT pinned,
    pinned_at = CASE WHEN NOT pinned THEN now() ELSE NULL END
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  RETURNING pinned INTO v_pinned;

  RETURN v_pinned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_notification_pin TO authenticated;

-- Function to dismiss notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET dismissed = true, dismissed_at = now()
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    AND read = false
    AND dismissed = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;

-- Add notifications to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Comment on table
COMMENT ON TABLE public.notifications IS 'Stores user notifications with support for read/pin/dismiss states';

```

---


### Migration 25: 20251117200100_create_notification_triggers.sql

```sql
-- Triggers to automatically create notifications for various events

-- Trigger for new issues
CREATE OR REPLACE FUNCTION public.notify_new_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Get all admin user IDs for the tenant
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE tenant_id = NEW.tenant_id AND role = 'admin';

  -- Create notification for each admin
  IF v_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_ids
    LOOP
      PERFORM public.create_notification(
        NEW.tenant_id,
        v_admin_id,
        'issue',
        NEW.severity::TEXT,
        'New Issue Reported',
        NEW.description,
        '/admin/issues',
        'issue',
        NEW.id,
        jsonb_build_object('issue_id', NEW.id, 'severity', NEW.severity)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_issue
  AFTER INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_issue();

-- Trigger for new parts
CREATE OR REPLACE FUNCTION public.notify_new_part()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_job_number TEXT;
BEGIN
  -- Get job number for context
  SELECT job_number INTO v_job_number
  FROM public.jobs
  WHERE id = NEW.job_id;

  -- Get all admin user IDs for the tenant
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE tenant_id = NEW.tenant_id AND role = 'admin';

  -- Create notification for each admin
  IF v_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_ids
    LOOP
      PERFORM public.create_notification(
        NEW.tenant_id,
        v_admin_id,
        'new_part',
        'low',
        'New Part Added',
        'Part ' || COALESCE(NEW.name, 'Unnamed') || ' added to Job ' || COALESCE(v_job_number::TEXT, 'Unknown'),
        '/admin/jobs',
        'part',
        NEW.id,
        jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_name', NEW.name)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_part
  AFTER INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_part();

-- Trigger for new users
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Only notify for new non-admin users
  IF NEW.role != 'admin' THEN
    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = NEW.tenant_id AND role = 'admin' AND id != NEW.id;

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          NEW.tenant_id,
          v_admin_id,
          'new_user',
          'low',
          'New User Joined',
          COALESCE(NEW.full_name, 'A new user') || ' has joined as ' || NEW.role,
          '/admin/config/users',
          'user',
          NEW.id,
          jsonb_build_object('user_id', NEW.id, 'full_name', NEW.full_name, 'role', NEW.role)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();

-- Trigger for new assignments
CREATE OR REPLACE FUNCTION public.notify_new_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_number TEXT;
  v_part_name TEXT;
BEGIN
  -- Get job and part details for context
  SELECT j.job_number INTO v_job_number
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  IF NEW.part_id IS NOT NULL THEN
    SELECT p.name INTO v_part_name
    FROM public.parts p
    WHERE p.id = NEW.part_id;
  END IF;

  -- Create notification for the assigned operator
  PERFORM public.create_notification(
    NEW.tenant_id,
    NEW.operator_id,
    'assignment',
    'medium',
    'New Assignment',
    'You have been assigned to Job ' || COALESCE(v_job_number::TEXT, 'Unknown') ||
    CASE WHEN v_part_name IS NOT NULL THEN ' - Part: ' || v_part_name ELSE '' END,
    '/operator/dashboard',
    'assignment',
    NEW.id,
    jsonb_build_object(
      'assignment_id', NEW.id,
      'job_id', NEW.job_id,
      'part_id', NEW.part_id,
      'job_number', v_job_number,
      'part_name', v_part_name
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_assignment
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_assignment();

-- Trigger for jobs due soon (runs daily via cron or can be called manually)
CREATE OR REPLACE FUNCTION public.check_jobs_due_soon()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_count INTEGER := 0;
  v_days_until_due INTEGER;
  v_severity TEXT;
BEGIN
  -- Check for jobs due within the next 7 days
  FOR v_job IN
    SELECT id, tenant_id, job_number, customer, due_date
    FROM public.jobs
    WHERE status != 'completed'
      AND due_date IS NOT NULL
      AND due_date <= (CURRENT_DATE + INTERVAL '7 days')
      AND due_date >= CURRENT_DATE
      -- Don't create duplicate notifications (check if one was created in the last 24 hours)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE reference_type = 'job'
          AND reference_id = jobs.id
          AND type = 'job_due'
          AND created_at > now() - INTERVAL '24 hours'
      )
  LOOP
    -- Calculate days until due
    v_days_until_due := EXTRACT(DAY FROM (v_job.due_date - CURRENT_DATE));

    -- Set severity based on days until due
    IF v_days_until_due <= 1 THEN
      v_severity := 'high';
    ELSIF v_days_until_due <= 3 THEN
      v_severity := 'medium';
    ELSE
      v_severity := 'low';
    END IF;

    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = v_job.tenant_id AND role = 'admin';

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          v_job.tenant_id,
          v_admin_id,
          'job_due',
          v_severity,
          'Job Due Soon',
          'JOB-' || v_job.job_number || ' - ' || COALESCE(v_job.customer, 'No customer') ||
          ' is due in ' || v_days_until_due || ' day(s)',
          '/admin/jobs',
          'job',
          v_job.id,
          jsonb_build_object(
            'job_id', v_job.id,
            'job_number', v_job.job_number,
            'customer', v_job.customer,
            'due_date', v_job.due_date,
            'days_until_due', v_days_until_due
          )
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_jobs_due_soon TO authenticated;

-- Trigger for part completion
CREATE OR REPLACE FUNCTION public.notify_part_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_job_number TEXT;
BEGIN
  -- Only notify when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get job number for context
    SELECT job_number INTO v_job_number
    FROM public.jobs
    WHERE id = NEW.job_id;

    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = NEW.tenant_id AND role = 'admin';

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          NEW.tenant_id,
          v_admin_id,
          'part_completed',
          'low',
          'Part Completed',
          'Part ' || COALESCE(NEW.name, 'Unnamed') || ' for Job ' || COALESCE(v_job_number::TEXT, 'Unknown') || ' has been completed',
          '/admin/jobs',
          'part',
          NEW.id,
          jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_name', NEW.name)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_part_completed
  AFTER UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_part_completed();

-- Comment on functions
COMMENT ON FUNCTION public.notify_new_issue() IS 'Automatically creates notifications when new issues are reported';
COMMENT ON FUNCTION public.notify_new_part() IS 'Automatically creates notifications when new parts are added';
COMMENT ON FUNCTION public.notify_new_user() IS 'Automatically creates notifications when new users join';
COMMENT ON FUNCTION public.notify_new_assignment() IS 'Automatically creates notifications when operators are assigned to jobs';
COMMENT ON FUNCTION public.check_jobs_due_soon() IS 'Checks for jobs due soon and creates notifications - can be run via cron';
COMMENT ON FUNCTION public.notify_part_completed() IS 'Automatically creates notifications when parts are marked as completed';

```

---

## Summary

Total migrations: 25

### Key Features Added
- Tenants and multi-tenancy support
- Subscriptions and plan limits
- Materials management system
- Resources system (tooling, fixtures, molds)
- Time tracking with pause functionality
- Onboarding tracking
- Usage tracking and plan limits
- Parts images storage bucket
- Fulltext search indexes
- Notifications system with real-time triggers
- RLS (Row Level Security) policies
- Realtime publication updates
