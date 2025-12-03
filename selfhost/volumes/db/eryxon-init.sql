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
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;-- Remove placeholder profiles (they won't work without auth.users entries)
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
-- 4. Create additional operators through the Config > Users page-- Fix username constraint to be tenant-scoped instead of global
-- This allows multiple tenants to have the same username

-- Drop the global unique constraint on username
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Add a composite unique constraint on (tenant_id, username)
-- This ensures username is unique within each tenant, but not globally
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tenant_username_key 
  UNIQUE (tenant_id, username);

-- Now multiple tenants can have "admin", "office", etc. as usernames-- Create API keys table
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
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);-- Rename stages to cells
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
CREATE INDEX IF NOT EXISTS idx_cells_sequence ON cells(sequence);-- Clear all data except tenant information (profiles table)
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

-- Profiles table is preserved to keep tenant information-- Update realtime publications for renamed tables
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
);-- Add pause tracking for time entries
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
ON CONFLICT (tenant_id, name) DO NOTHING;-- Add onboarding tracking fields to profiles table
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
COMMENT ON COLUMN public.profiles.mock_data_imported IS 'Indicates if mock data has been imported for this user';-- Add onboarding tracking fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mock_data_imported BOOLEAN DEFAULT FALSE;-- Add onboarding tracking fields to profiles table
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
  EXECUTE FUNCTION public.trigger_decrement_parts();-- Fix search_path security warnings for all functions

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
$$;-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;-- Store credentials in Vault for cron job authentication
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
);-- Migration: Usage Tracking, Plan Limits Enforcement, and Monthly Reset
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
-- Migration: Add seed functions for scrap reasons and demo data
-- This migration creates SQL functions to seed default scrap reasons and demo operators

-- ============================================================================
-- FUNCTION: seed_default_scrap_reasons
-- ============================================================================
-- Seeds standard scrap/rejection reason codes for a tenant
-- Categories: Material, Process, Equipment, Operator, Design, Other

CREATE OR REPLACE FUNCTION public.seed_default_scrap_reasons(p_tenant_id UUID)
RETURNS TABLE(inserted_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if scrap reasons already exist for this tenant
  SELECT COUNT(*) INTO v_count
  FROM public.scrap_reasons
  WHERE tenant_id = p_tenant_id;

  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Scrap reasons already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  -- Insert default scrap reasons
  INSERT INTO public.scrap_reasons (tenant_id, code, description, category)
  VALUES
    -- Material defects
    (p_tenant_id, 'MAT-001', 'Material surface defect', 'Material'),
    (p_tenant_id, 'MAT-002', 'Material thickness out of spec', 'Material'),
    (p_tenant_id, 'MAT-003', 'Material contamination', 'Material'),
    (p_tenant_id, 'MAT-004', 'Material hardness issue', 'Material'),
    (p_tenant_id, 'MAT-005', 'Wrong material supplied', 'Material'),

    -- Process issues
    (p_tenant_id, 'PRC-001', 'Cutting burn marks', 'Process'),
    (p_tenant_id, 'PRC-002', 'Bend angle out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-003', 'Weld defect - porosity', 'Process'),
    (p_tenant_id, 'PRC-004', 'Weld defect - undercut', 'Process'),
    (p_tenant_id, 'PRC-005', 'Surface finish defect', 'Process'),
    (p_tenant_id, 'PRC-006', 'Dimensions out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-007', 'Deburring incomplete', 'Process'),
    (p_tenant_id, 'PRC-008', 'Coating defect - runs/sags', 'Process'),
    (p_tenant_id, 'PRC-009', 'Coating defect - insufficient coverage', 'Process'),

    -- Equipment problems
    (p_tenant_id, 'EQP-001', 'Machine calibration drift', 'Equipment'),
    (p_tenant_id, 'EQP-002', 'Tool wear excessive', 'Equipment'),
    (p_tenant_id, 'EQP-003', 'Equipment malfunction', 'Equipment'),
    (p_tenant_id, 'EQP-004', 'Fixture/tooling damage', 'Equipment'),
    (p_tenant_id, 'EQP-005', 'Clamp marks on part', 'Equipment'),

    -- Operator errors
    (p_tenant_id, 'OPR-001', 'Setup error', 'Operator'),
    (p_tenant_id, 'OPR-002', 'Wrong operation performed', 'Operator'),
    (p_tenant_id, 'OPR-003', 'Handling damage', 'Operator'),
    (p_tenant_id, 'OPR-004', 'Incorrect measurement', 'Operator'),
    (p_tenant_id, 'OPR-005', 'Assembly error', 'Operator'),

    -- Design issues
    (p_tenant_id, 'DSN-001', 'Design dimension error', 'Design'),
    (p_tenant_id, 'DSN-002', 'Design manufacturability issue', 'Design'),
    (p_tenant_id, 'DSN-003', 'Tolerance stack-up problem', 'Design'),

    -- Other
    (p_tenant_id, 'OTH-001', 'Customer specification change', 'Other'),
    (p_tenant_id, 'OTH-002', 'Prototype/first article', 'Other'),
    (p_tenant_id, 'OTH-003', 'Rework - customer request', 'Other'),
    (p_tenant_id, 'OTH-004', 'Unknown cause - investigation needed', 'Other');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, format('Successfully inserted %s default scrap reasons', v_count)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.seed_default_scrap_reasons IS 'Seeds standard scrap/rejection reason codes for a tenant';


-- ============================================================================
-- FUNCTION: seed_demo_operators
-- ============================================================================
-- Creates demo operator profiles for testing
-- Note: This creates profiles without auth.users entries
-- These are "shadow" operators for demonstration purposes only

CREATE OR REPLACE FUNCTION public.seed_demo_operators(p_tenant_id UUID)
RETURNS TABLE(created_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_operator_ids UUID[] := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
BEGIN
  -- Check if demo operators already exist
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
    AND role = 'operator'
    AND full_name LIKE 'Demo Operator%';

  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Demo operators already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  -- Insert demo operator profiles
  -- These are demonstration profiles without corresponding auth.users
  -- In production, operators should be created through proper signup/invitation flow

  INSERT INTO public.profiles (id, tenant_id, role, full_name, email, active)
  VALUES
    (v_operator_ids[1], p_tenant_id, 'operator', 'Demo Operator - John Smith', 'demo.operator1@example.com', true),
    (v_operator_ids[2], p_tenant_id, 'operator', 'Demo Operator - Maria Garcia', 'demo.operator2@example.com', true),
    (v_operator_ids[3], p_tenant_id, 'operator', 'Demo Operator - Wei Chen', 'demo.operator3@example.com', true),
    (v_operator_ids[4], p_tenant_id, 'operator', 'Demo Operator - Sarah Johnson', 'demo.operator4@example.com', true);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT
    v_count,
    format('Successfully created %s demo operators. Note: These are demonstration profiles only and cannot be used for actual login.', v_count)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.seed_demo_operators IS 'Creates demo operator profiles for testing (without auth.users entries)';


-- ============================================================================
-- FUNCTION: seed_demo_resources
-- ============================================================================
-- Creates sample resources (molds, tooling, fixtures, materials) for demo

CREATE OR REPLACE FUNCTION public.seed_demo_resources(p_tenant_id UUID)
RETURNS TABLE(created_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_resource_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
BEGIN
  -- Check if resources already exist
  SELECT COUNT(*) INTO v_count
  FROM public.resources
  WHERE tenant_id = p_tenant_id;

  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Resources already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  -- Insert sample resources
  INSERT INTO public.resources (id, tenant_id, name, type, identifier, description, location, status, metadata)
  VALUES
    -- Molds
    (v_resource_ids[1], p_tenant_id, 'Enclosure Mold #1', 'mold', 'MOLD-001',
     '400x300mm sheet metal enclosure mold', 'Press Station 1', 'available',
     '{"moldId": "MOLD-001", "moldName": "Enclosure Mold #1", "cavities": 1, "tonnage": 150, "setupTime": 30, "cycleTime": 45}'::jsonb),

    (v_resource_ids[2], p_tenant_id, 'Bracket Forming Die', 'mold', 'MOLD-002',
     'L-bracket forming die set', 'Press Station 2', 'available',
     '{"moldId": "MOLD-002", "moldName": "Bracket Die", "cavities": 2, "tonnage": 80, "setupTime": 20, "cycleTime": 30}'::jsonb),

    -- Tooling
    (v_resource_ids[3], p_tenant_id, 'Laser Cutting Head - Fiber 3kW', 'tooling', 'TOOL-LC-001',
     'High-precision fiber laser cutting head', 'Laser Cell', 'in_use',
     '{"toolId": "TOOL-LC-001", "toolType": "cutting", "material": "Carbide", "lifeExpectancy": 10000, "currentUses": 3250}'::jsonb),

    (v_resource_ids[4], p_tenant_id, 'V-Die Set 90° - 2mm', 'tooling', 'TOOL-BD-001',
     'Standard V-die for 90-degree bends in 2mm material', 'Bending Cell', 'available',
     '{"toolId": "TOOL-BD-001", "toolType": "forming", "diameter": 2, "length": 1000}'::jsonb),

    (v_resource_ids[5], p_tenant_id, 'Spot Welding Gun #3', 'tooling', 'TOOL-WD-003',
     'Pneumatic spot welding gun', 'Welding Cell', 'available',
     '{"toolId": "TOOL-WD-003", "toolType": "welding", "maintenanceDue": "2025-12-15"}'::jsonb),

    -- Fixtures
    (v_resource_ids[6], p_tenant_id, 'Welding Fixture - Panel Assembly', 'fixture', 'FIX-001',
     'Custom fixture for panel welding alignment', 'Welding Cell', 'available',
     '{"fixtureId": "FIX-001", "fixtureType": "welding", "capacity": 10, "calibrationDue": "2025-11-30"}'::jsonb),

    (v_resource_ids[7], p_tenant_id, 'QC Inspection Gauge Set', 'fixture', 'FIX-QC-001',
     'Precision measurement gauge set for QC', 'Quality Control', 'available',
     '{"fixtureId": "FIX-QC-001", "fixtureType": "inspection", "calibrationDue": "2025-12-01", "certificationNumber": "CAL-2024-1156"}'::jsonb),

    -- Materials
    (v_resource_ids[8], p_tenant_id, 'SS304 Sheet - 2mm', 'material', 'MAT-SS304-2',
     'Stainless steel 304 sheet stock, 2mm thickness', 'Material Storage A', 'available',
     '{"materialType": "Stainless Steel", "grade": "304", "thickness": 2, "width": 1220, "length": 2440, "finish": "2B", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-8834"}'::jsonb),

    (v_resource_ids[9], p_tenant_id, 'AL6061 Sheet - 3mm', 'material', 'MAT-AL6061-3',
     'Aluminum 6061-T6 sheet stock, 3mm thickness', 'Material Storage B', 'available',
     '{"materialType": "Aluminum", "grade": "6061-T6", "thickness": 3, "width": 1220, "length": 2440, "finish": "Mill", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-9012"}'::jsonb);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, format('Successfully created %s demo resources', v_count)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.seed_demo_resources IS 'Creates sample resources (molds, tooling, fixtures, materials) for demonstration';


-- ============================================================================
-- FUNCTION: get_part_routing
-- ============================================================================
-- Returns the routing (sequence of operations) for a specific part
-- Used by QRM metrics to analyze part flow through manufacturing cells

CREATE OR REPLACE FUNCTION public.get_part_routing(p_part_id UUID)
RETURNS TABLE(
  operation_id UUID,
  operation_number TEXT,
  cell_id UUID,
  cell_name TEXT,
  sequence INTEGER,
  description TEXT,
  status TEXT,
  estimated_hours NUMERIC,
  actual_hours NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS operation_id,
    o.operation_number,
    o.cell_id,
    c.name AS cell_name,
    o.sequence,
    o.description,
    o.status,
    o.estimated_hours,
    COALESCE(
      (SELECT SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 3600)
       FROM time_entries te
       WHERE te.operation_id = o.id
         AND te.ended_at IS NOT NULL),
      0
    ) AS actual_hours
  FROM operations o
  LEFT JOIN cells c ON c.id = o.cell_id
  WHERE o.part_id = p_part_id
    AND o.tenant_id = get_user_tenant_id()
  ORDER BY o.sequence ASC;
END;
$$;

COMMENT ON FUNCTION public.get_part_routing IS 'Returns the routing (sequence of operations) for a specific part with timing data';


-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow authenticated users to execute these functions
GRANT EXECUTE ON FUNCTION public.seed_default_scrap_reasons TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_operators TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_resources TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_part_routing TO authenticated;
-- Re-applied seed functions with explicit drops to allow signature changes
-- Functions: seed_default_scrap_reasons, seed_demo_operators, seed_demo_resources, get_part_routing

DROP FUNCTION IF EXISTS public.seed_default_scrap_reasons(UUID);
DROP FUNCTION IF EXISTS public.seed_demo_operators(UUID);
DROP FUNCTION IF EXISTS public.seed_demo_resources(UUID);
DROP FUNCTION IF EXISTS public.get_part_routing(UUID);

CREATE OR REPLACE FUNCTION public.seed_default_scrap_reasons(p_tenant_id UUID)
RETURNS TABLE(inserted_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.scrap_reasons WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Scrap reasons already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.scrap_reasons (tenant_id, code, description, category)
  VALUES
    (p_tenant_id, 'MAT-001', 'Material surface defect', 'Material'),
    (p_tenant_id, 'MAT-002', 'Material thickness out of spec', 'Material'),
    (p_tenant_id, 'MAT-003', 'Material contamination', 'Material'),
    (p_tenant_id, 'MAT-004', 'Material hardness issue', 'Material'),
    (p_tenant_id, 'MAT-005', 'Wrong material supplied', 'Material'),
    (p_tenant_id, 'PRC-001', 'Cutting burn marks', 'Process'),
    (p_tenant_id, 'PRC-002', 'Bend angle out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-003', 'Weld defect - porosity', 'Process'),
    (p_tenant_id, 'PRC-004', 'Weld defect - undercut', 'Process'),
    (p_tenant_id, 'PRC-005', 'Surface finish defect', 'Process'),
    (p_tenant_id, 'PRC-006', 'Dimensions out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-007', 'Deburring incomplete', 'Process'),
    (p_tenant_id, 'PRC-008', 'Coating defect - runs/sags', 'Process'),
    (p_tenant_id, 'PRC-009', 'Coating defect - insufficient coverage', 'Process'),
    (p_tenant_id, 'EQP-001', 'Machine calibration drift', 'Equipment'),
    (p_tenant_id, 'EQP-002', 'Tool wear excessive', 'Equipment'),
    (p_tenant_id, 'EQP-003', 'Equipment malfunction', 'Equipment'),
    (p_tenant_id, 'EQP-004', 'Fixture/tooling damage', 'Equipment'),
    (p_tenant_id, 'EQP-005', 'Clamp marks on part', 'Equipment'),
    (p_tenant_id, 'OPR-001', 'Setup error', 'Operator'),
    (p_tenant_id, 'OPR-002', 'Wrong operation performed', 'Operator'),
    (p_tenant_id, 'OPR-003', 'Handling damage', 'Operator'),
    (p_tenant_id, 'OPR-004', 'Incorrect measurement', 'Operator'),
    (p_tenant_id, 'OPR-005', 'Assembly error', 'Operator'),
    (p_tenant_id, 'DSN-001', 'Design dimension error', 'Design'),
    (p_tenant_id, 'DSN-002', 'Design manufacturability issue', 'Design'),
    (p_tenant_id, 'DSN-003', 'Tolerance stack-up problem', 'Design'),
    (p_tenant_id, 'OTH-001', 'Customer specification change', 'Other'),
    (p_tenant_id, 'OTH-002', 'Prototype/first article', 'Other'),
    (p_tenant_id, 'OTH-003', 'Rework - customer request', 'Other'),
    (p_tenant_id, 'OTH-004', 'Unknown cause - investigation needed', 'Other');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully inserted %s default scrap reasons', v_count)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.seed_default_scrap_reasons IS 'Seeds standard scrap/rejection reason codes for a tenant';

CREATE OR REPLACE FUNCTION public.seed_demo_operators(p_tenant_id UUID)
RETURNS TABLE(created_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_operator_ids UUID[] := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE tenant_id = p_tenant_id AND role = 'operator' AND full_name LIKE 'Demo Operator%';
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Demo operators already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, role, full_name, email, active)
  VALUES
    (v_operator_ids[1], p_tenant_id, 'operator', 'Demo Operator - John Smith', 'demo.operator1@example.com', true),
    (v_operator_ids[2], p_tenant_id, 'operator', 'Demo Operator - Maria Garcia', 'demo.operator2@example.com', true),
    (v_operator_ids[3], p_tenant_id, 'operator', 'Demo Operator - Wei Chen', 'demo.operator3@example.com', true),
    (v_operator_ids[4], p_tenant_id, 'operator', 'Demo Operator - Sarah Johnson', 'demo.operator4@example.com', true);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully created %s demo operators. Note: These are demonstration profiles only and cannot be used for actual login.', v_count)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.seed_demo_operators IS 'Creates demo operator profiles for testing (without auth.users entries)';

CREATE OR REPLACE FUNCTION public.seed_demo_resources(p_tenant_id UUID)
RETURNS TABLE(created_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_resource_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Resources already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.resources (id, tenant_id, name, type, identifier, description, location, status, metadata)
  VALUES
    (v_resource_ids[1], p_tenant_id, 'Enclosure Mold #1', 'mold', 'MOLD-001',
     '400x300mm sheet metal enclosure mold', 'Press Station 1', 'available',
     '{"moldId": "MOLD-001", "moldName": "Enclosure Mold #1", "cavities": 1, "tonnage": 150, "setupTime": 30, "cycleTime": 45}'::jsonb),
    (v_resource_ids[2], p_tenant_id, 'Bracket Forming Die', 'mold', 'MOLD-002',
     'L-bracket forming die set', 'Press Station 2', 'available',
     '{"moldId": "MOLD-002", "moldName": "Bracket Die", "cavities": 2, "tonnage": 80, "setupTime": 20, "cycleTime": 30}'::jsonb),
    (v_resource_ids[3], p_tenant_id, 'Laser Cutting Head - Fiber 3kW', 'tooling', 'TOOL-LC-001',
     'High-precision fiber laser cutting head', 'Laser Cell', 'in_use',
     '{"toolId": "TOOL-LC-001", "toolType": "cutting", "material": "Carbide", "lifeExpectancy": 10000, "currentUses": 3250}'::jsonb),
    (v_resource_ids[4], p_tenant_id, 'V-Die Set 90° - 2mm', 'tooling', 'TOOL-BD-001',
     'Standard V-die for 90-degree bends in 2mm material', 'Bending Cell', 'available',
     '{"toolId": "TOOL-BD-001", "toolType": "forming", "diameter": 2, "length": 1000}'::jsonb),
    (v_resource_ids[5], p_tenant_id, 'Spot Welding Gun #3', 'tooling', 'TOOL-WD-003',
     'Pneumatic spot welding gun', 'Welding Cell', 'available',
     '{"toolId": "TOOL-WD-003", "toolType": "welding", "maintenanceDue": "2025-12-15"}'::jsonb),
    (v_resource_ids[6], p_tenant_id, 'Welding Fixture - Panel Assembly', 'fixture', 'FIX-001',
     'Custom fixture for panel welding alignment', 'Welding Cell', 'available',
     '{"fixtureId": "FIX-001", "fixtureType": "welding", "capacity": 10, "calibrationDue": "2025-11-30"}'::jsonb),
    (v_resource_ids[7], p_tenant_id, 'QC Inspection Gauge Set', 'fixture', 'FIX-QC-001',
     'Precision measurement gauge set for QC', 'Quality Control', 'available',
     '{"fixtureId": "FIX-QC-001", "fixtureType": "inspection", "calibrationDue": "2025-12-01", "certificationNumber": "CAL-2024-1156"}'::jsonb),
    (v_resource_ids[8], p_tenant_id, 'SS304 Sheet - 2mm', 'material', 'MAT-SS304-2',
     'Stainless steel 304 sheet stock, 2mm thickness', 'Material Storage A', 'available',
     '{"materialType": "Stainless Steel", "grade": "304", "thickness": 2, "width": 1220, "length": 2440, "finish": "2B", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-8834"}'::jsonb),
    (v_resource_ids[9], p_tenant_id, 'AL6061 Sheet - 3mm', 'material', 'MAT-AL6061-3',
     'Aluminum 6061-T6 sheet stock, 3mm thickness', 'Material Storage B', 'available',
     '{"materialType": "Aluminum", "grade": "6061-T6", "thickness": 3, "width": 1220, "length": 2440, "finish": "Mill", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-9012"}'::jsonb);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully created %s demo resources', v_count)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.seed_demo_resources IS 'Creates sample resources (molds, tooling, fixtures, materials) for demonstration';

CREATE OR REPLACE FUNCTION public.get_part_routing(p_part_id UUID)
RETURNS TABLE(
  operation_id UUID,
  operation_number TEXT,
  cell_id UUID,
  cell_name TEXT,
  sequence INTEGER,
  description TEXT,
  status TEXT,
  estimated_hours NUMERIC,
  actual_hours NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS operation_id,
    o.operation_number,
    o.cell_id,
    c.name AS cell_name,
    o.sequence,
    o.description,
    o.status,
    o.estimated_hours,
    COALESCE(
      (SELECT SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 3600)
       FROM time_entries te
       WHERE te.operation_id = o.id
         AND te.ended_at IS NOT NULL),
      0
    ) AS actual_hours
  FROM operations o
  LEFT JOIN cells c ON c.id = o.cell_id
  WHERE o.part_id = p_part_id
    AND o.tenant_id = get_user_tenant_id()
  ORDER BY o.sequence ASC;
END;
$$;

COMMENT ON FUNCTION public.get_part_routing IS 'Returns the routing (sequence of operations) for a specific part with timing data';

GRANT EXECUTE ON FUNCTION public.seed_default_scrap_reasons TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_operators TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_resources TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_part_routing TO authenticated;
-- Update handle_new_user function to create tenants with 'suspended' status
-- New signups require manual approval before they can use the system

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_username TEXT;
  v_full_name TEXT;
  v_role app_role;
  v_tenant_status subscription_status;
  v_is_new_tenant BOOLEAN := false;
BEGIN
  -- Extract metadata
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  v_tenant_status := COALESCE((NEW.raw_user_meta_data->>'tenant_status')::subscription_status, 'trial');
  
  -- Check if tenant_id provided (invitation flow)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operator');
  ELSE
    -- New signup - create tenant with suspended status for manual approval
    v_is_new_tenant := true;
    v_role := 'admin'; -- First user is always admin
    
    INSERT INTO public.tenants (
      name,
      company_name,
      plan,
      status
    ) VALUES (
      COALESCE(v_company_name, v_username || '''s Organization'),
      v_company_name,
      'free', -- Default to free plan
      v_tenant_status -- Will be 'suspended' for new signups
    )
    RETURNING id INTO v_tenant_id;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    is_machine,
    active
  ) VALUES (
    NEW.id,
    v_tenant_id,
    v_username,
    v_full_name,
    NEW.email,
    v_role,
    COALESCE((NEW.raw_user_meta_data->>'is_machine')::BOOLEAN, false),
    true
  );
  
  -- Create user_roles entry for RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  RETURN NEW;
END;
$function$;-- Fix log_activity function to handle UUID entity_id correctly
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_tenant_id UUID;
  v_action TEXT;
  v_entity_name TEXT;
  v_description TEXT;
  v_changes JSONB;
  v_entity_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  SELECT email, full_name, tenant_id
  INTO v_user_email, v_user_name, v_tenant_id
  FROM profiles WHERE id = v_user_id;
  
  IF v_tenant_id IS NULL THEN
    v_tenant_id := COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END), NULL);
  END IF;
  
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_action := LOWER(TG_OP);
  
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;  -- Keep as UUID
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    v_entity_id := NEW.id;  -- Keep as UUID
    IF TG_OP = 'UPDATE' THEN
      v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSE
      v_changes := jsonb_build_object('new', to_jsonb(NEW));
    END IF;
  END IF;
  
  v_description := v_action || ' ' || TG_TABLE_NAME;
  
  INSERT INTO activity_log (
    tenant_id, user_id, user_email, user_name, action, entity_type,
    entity_id, entity_name, description, changes, metadata
  ) VALUES (
    v_tenant_id, v_user_id, v_user_email, v_user_name, v_action, TG_TABLE_NAME,
    v_entity_id, v_entity_id::TEXT, v_description, v_changes,
    jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;-- =====================================================
-- Seed Functions for Demo Data Generation
-- =====================================================
-- This migration adds SQL functions to seed demo data for new tenants
-- including scrap reasons, operators, resources, and part routing analytics

-- =====================================================
-- Function 1: seed_default_scrap_reasons
-- =====================================================
-- Seeds 31 standard scrap reason codes across 6 categories
-- Used during onboarding to provide realistic scrap tracking
CREATE OR REPLACE FUNCTION public.seed_default_scrap_reasons(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only seed if no scrap reasons exist for this tenant
  IF NOT EXISTS (SELECT 1 FROM scrap_reasons WHERE tenant_id = p_tenant_id) THEN
    -- Material defects
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
      (p_tenant_id, 'MAT-001', 'Material out of spec - thickness variance', 'material'),
      (p_tenant_id, 'MAT-002', 'Surface defects - scratches or dents', 'material'),
      (p_tenant_id, 'MAT-003', 'Wrong material supplied', 'material'),
      (p_tenant_id, 'MAT-004', 'Material contamination', 'material'),
      (p_tenant_id, 'MAT-005', 'Incorrect dimensions received', 'material');
    
    -- Process errors
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
      (p_tenant_id, 'PRO-001', 'Incorrect cutting dimensions', 'process'),
      (p_tenant_id, 'PRO-002', 'Bend angle out of tolerance', 'process'),
      (p_tenant_id, 'PRO-003', 'Welding defects - porosity or cracks', 'process'),
      (p_tenant_id, 'PRO-004', 'Assembly error - wrong configuration', 'process'),
      (p_tenant_id, 'PRO-005', 'Surface finish not meeting spec', 'process'),
      (p_tenant_id, 'PRO-006', 'Over-machined - too much material removed', 'process'),
      (p_tenant_id, 'PRO-007', 'Programming error in CNC code', 'process');
    
    -- Equipment issues
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
      (p_tenant_id, 'EQP-001', 'Machine calibration drift', 'equipment'),
      (p_tenant_id, 'EQP-002', 'Tool wear - excessive runout', 'equipment'),
      (p_tenant_id, 'EQP-003', 'Equipment malfunction during operation', 'equipment'),
      (p_tenant_id, 'EQP-004', 'Fixture or tooling failure', 'equipment'),
      (p_tenant_id, 'EQP-005', 'Power fluctuation during process', 'equipment');
    
    -- Operator errors
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
      (p_tenant_id, 'OPR-001', 'Incorrect setup or fixture placement', 'operator'),
      (p_tenant_id, 'OPR-002', 'Wrong tool or die selected', 'operator'),
      (p_tenant_id, 'OPR-003', 'Measurement error', 'operator'),
      (p_tenant_id, 'OPR-004', 'Handling damage', 'operator'),
      (p_tenant_id, 'OPR-005', 'Forgot to perform required step', 'operator'),
      (p_tenant_id, 'OPR-006', 'Used incorrect parameters', 'operator');
    
    -- Design issues
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
      (p_tenant_id, 'DES-001', 'Design not manufacturable as specified', 'design'),
      (p_tenant_id, 'DES-002', 'Drawing ambiguity or error', 'design'),
      (p_tenant_id, 'DES-003', 'Tolerances too tight for process capability', 'design'),
      (p_tenant_id, 'DES-004', 'Interference fit issues', 'design');
    
    -- Other
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
      (p_tenant_id, 'OTH-001', 'Customer requested change mid-production', 'other'),
      (p_tenant_id, 'OTH-002', 'Prototype/test piece - planned scrap', 'other'),
      (p_tenant_id, 'OTH-003', 'Unknown cause - needs investigation', 'other');
  END IF;
END;
$$;

-- =====================================================
-- Function 2: seed_demo_operators
-- =====================================================
-- Creates 4 demo operator profiles for testing the operator terminal
-- These are non-login users (is_machine = false, has_email_login = false)
CREATE OR REPLACE FUNCTION public.seed_demo_operators(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_names TEXT[] := ARRAY[
    'Demo Operator - John Smith',
    'Demo Operator - Maria Garcia', 
    'Demo Operator - Wei Chen',
    'Demo Operator - Sarah Johnson'
  ];
  v_operator_name TEXT;
  v_operator_id UUID;
BEGIN
  -- Only create if no demo operators exist
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE tenant_id = p_tenant_id 
    AND role = 'operator' 
    AND full_name LIKE 'Demo Operator%'
  ) THEN
    FOREACH v_operator_name IN ARRAY v_operator_names
    LOOP
      v_operator_id := gen_random_uuid();
      
      -- Create profile
      INSERT INTO profiles (
        id,
        tenant_id,
        username,
        full_name,
        email,
        role,
        is_machine,
        has_email_login,
        active
      ) VALUES (
        v_operator_id,
        p_tenant_id,
        lower(replace(v_operator_name, ' ', '_')),
        v_operator_name,
        lower(replace(v_operator_name, ' ', '.')) || '@demo.local',
        'operator',
        false,
        false,
        true
      );
      
      -- Create user_roles entry for RLS
      INSERT INTO user_roles (user_id, role)
      VALUES (v_operator_id, 'operator');
    END LOOP;
  END IF;
END;
$$;

-- =====================================================
-- Function 3: seed_demo_resources
-- =====================================================
-- Creates 9 sample resources: 2 molds, 3 tooling, 2 fixtures, 2 materials
-- Used to demonstrate resource allocation and tracking features
CREATE OR REPLACE FUNCTION public.seed_demo_resources(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only seed if no resources exist for this tenant
  IF NOT EXISTS (SELECT 1 FROM resources WHERE tenant_id = p_tenant_id) THEN
    -- Molds
    INSERT INTO resources (tenant_id, name, type, identifier, description, status, location, active) VALUES
      (p_tenant_id, 'Enclosure Mold #M001', 'mold', 'M001', 'Precision mold for enclosure top panels', 'available', 'Rack A-3', true),
      (p_tenant_id, 'Bracket Forming Die #M002', 'mold', 'M002', 'L-bracket forming die for mounting hardware', 'available', 'Rack A-5', true);
    
    -- Tooling
    INSERT INTO resources (tenant_id, name, type, identifier, description, status, location, active) VALUES
      (p_tenant_id, 'Laser Cutting Head #T001', 'tooling', 'T001', 'High-precision fiber laser cutting head', 'available', 'Laser Cell', true),
      (p_tenant_id, 'V-Die Set 90° #T002', 'tooling', 'T002', 'Standard 90-degree V-die for press brake', 'available', 'Bending Cell', true),
      (p_tenant_id, 'Spot Welding Gun #T003', 'tooling', 'T003', 'MIG welding gun with spot welding capability', 'available', 'Welding Cell', true);
    
    -- Fixtures
    INSERT INTO resources (tenant_id, name, type, identifier, description, status, location, active) VALUES
      (p_tenant_id, 'Welding Fixture #F001', 'fixture', 'F001', 'Adjustable welding fixture for enclosure assembly', 'available', 'Welding Cell', true),
      (p_tenant_id, 'QC Inspection Gauge Set #F002', 'fixture', 'F002', 'Complete gauge set for final quality inspection', 'available', 'QC Station', true);
    
    -- Materials
    INSERT INTO resources (tenant_id, name, type, identifier, description, status, location, active) VALUES
      (p_tenant_id, 'SS304 Sheet Stock - 2mm', 'material', 'MAT-SS304-2', 'Stainless steel 304 sheet, 2mm thickness', 'available', 'Material Storage', true),
      (p_tenant_id, 'AL6061 Sheet Stock - 3mm', 'material', 'MAT-AL6061-3', 'Aluminum 6061-T6 sheet, 3mm thickness', 'available', 'Material Storage', true);
  END IF;
END;
$$;

-- =====================================================
-- Function 4: get_part_routing
-- =====================================================
-- Returns the operation sequence for a part with timing and status data
-- Used by QRM metrics to analyze workflow and calculate flow times
CREATE OR REPLACE FUNCTION public.get_part_routing(p_part_id UUID)
RETURNS TABLE(
  operation_id UUID,
  operation_name TEXT,
  cell_id UUID,
  cell_name TEXT,
  sequence INTEGER,
  status task_status,
  estimated_time INTEGER,
  actual_time INTEGER,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id as operation_id,
    o.operation_name,
    o.cell_id,
    c.name as cell_name,
    o.sequence,
    o.status,
    o.estimated_time,
    o.actual_time,
    o.completed_at
  FROM operations o
  JOIN cells c ON o.cell_id = c.id
  WHERE o.part_id = p_part_id
  ORDER BY o.sequence ASC;
$$;

-- =====================================================
-- Permissions
-- =====================================================
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_default_scrap_reasons(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_operators(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_resources(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_part_routing(UUID) TO authenticated;-- =====================================================
-- Migration: Add Demo Mode Tracking to Tenants
-- =====================================================
-- This migration adds fields to track demo data status
-- Prevents duplicate seeding and allows easy identification of demo tenants

-- Add demo mode tracking columns to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS demo_mode_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_data_seeded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_data_seeded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_mode_acknowledged BOOLEAN DEFAULT false;

-- Add index for quick demo mode queries
CREATE INDEX IF NOT EXISTS idx_tenants_demo_mode ON public.tenants(demo_mode_enabled) WHERE demo_mode_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.demo_mode_enabled IS 'Indicates if tenant is using demo data. Set to true when demo data is seeded, false when cleared.';
COMMENT ON COLUMN public.tenants.demo_data_seeded_at IS 'Timestamp when demo data was last seeded for this tenant.';
COMMENT ON COLUMN public.tenants.demo_data_seeded_by IS 'User ID who seeded the demo data (if available).';
COMMENT ON COLUMN public.tenants.demo_mode_acknowledged IS 'User acknowledged they are okay keeping demo data. When false, show persistent banner. When true, show subtle indicator only.';

-- =====================================================
-- Helper Functions for Demo Mode Management
-- =====================================================

-- Function to enable demo mode for a tenant
CREATE OR REPLACE FUNCTION public.enable_demo_mode(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = true,
    demo_data_seeded_at = NOW(),
    demo_data_seeded_by = p_user_id
  WHERE id = p_tenant_id;
END;
$$;

-- Function to disable demo mode for a tenant
CREATE OR REPLACE FUNCTION public.disable_demo_mode(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;
END;
$$;

-- Function to check if tenant is in demo mode
CREATE OR REPLACE FUNCTION public.is_demo_mode(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(demo_mode_enabled, false)
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- Function to acknowledge demo mode (dismiss banner)
CREATE OR REPLACE FUNCTION public.acknowledge_demo_mode(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET demo_mode_acknowledged = true
  WHERE id = p_tenant_id;
END;
$$;

-- Function to check if demo mode needs acknowledgment (for banner display)
CREATE OR REPLACE FUNCTION public.should_show_demo_banner(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(demo_mode_enabled, false) = true
    AND COALESCE(demo_mode_acknowledged, false) = false
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- =====================================================
-- Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.enable_demo_mode(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_show_demo_banner(UUID) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION public.enable_demo_mode IS 'Marks a tenant as being in demo mode with timestamp and user tracking';
COMMENT ON FUNCTION public.disable_demo_mode IS 'Removes demo mode flag from tenant, typically called after clearMockData()';
COMMENT ON FUNCTION public.is_demo_mode IS 'Quick check to see if tenant has demo data active';
COMMENT ON FUNCTION public.acknowledge_demo_mode IS 'User acknowledges they want to keep demo data - dismisses the banner';
COMMENT ON FUNCTION public.should_show_demo_banner IS 'Returns true if demo mode is active but not yet acknowledged - triggers banner display';-- =====================================================
-- Migration: Add Demo Mode Tracking to Tenants
-- =====================================================
-- This migration adds fields to track demo data status
-- Prevents duplicate seeding and allows easy identification of demo tenants

-- Add demo mode tracking columns to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS demo_mode_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_data_seeded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_data_seeded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_mode_acknowledged BOOLEAN DEFAULT false;

-- Add index for quick demo mode queries
CREATE INDEX IF NOT EXISTS idx_tenants_demo_mode ON public.tenants(demo_mode_enabled) WHERE demo_mode_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.demo_mode_enabled IS 'Indicates if tenant is using demo data. Set to true when demo data is seeded, false when cleared.';
COMMENT ON COLUMN public.tenants.demo_data_seeded_at IS 'Timestamp when demo data was last seeded for this tenant.';
COMMENT ON COLUMN public.tenants.demo_data_seeded_by IS 'User ID who seeded the demo data (if available).';
COMMENT ON COLUMN public.tenants.demo_mode_acknowledged IS 'User acknowledged they are okay keeping demo data. When false, show persistent banner. When true, show subtle indicator only.';

-- =====================================================
-- Helper Functions for Demo Mode Management
-- =====================================================

-- Function to enable demo mode for a tenant
CREATE OR REPLACE FUNCTION public.enable_demo_mode(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = true,
    demo_data_seeded_at = NOW(),
    demo_data_seeded_by = p_user_id
  WHERE id = p_tenant_id;
END;
$$;

-- Function to disable demo mode for a tenant
CREATE OR REPLACE FUNCTION public.disable_demo_mode(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;
END;
$$;

-- Function to check if tenant is in demo mode
CREATE OR REPLACE FUNCTION public.is_demo_mode(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(demo_mode_enabled, false)
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- Function to acknowledge demo mode (dismiss banner)
CREATE OR REPLACE FUNCTION public.acknowledge_demo_mode(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants
  SET demo_mode_acknowledged = true
  WHERE id = p_tenant_id;
END;
$$;

-- Function to check if demo mode needs acknowledgment (for banner display)
CREATE OR REPLACE FUNCTION public.should_show_demo_banner(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(demo_mode_enabled, false) = true
    AND COALESCE(demo_mode_acknowledged, false) = false
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- =====================================================
-- Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.enable_demo_mode(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_demo_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_show_demo_banner(UUID) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION public.enable_demo_mode IS 'Marks a tenant as being in demo mode with timestamp and user tracking';
COMMENT ON FUNCTION public.disable_demo_mode IS 'Removes demo mode flag from tenant, typically called after clearMockData()';
COMMENT ON FUNCTION public.is_demo_mode IS 'Quick check to see if tenant has demo data active';
COMMENT ON FUNCTION public.acknowledge_demo_mode IS 'User acknowledges they want to keep demo data - dismisses the banner';
COMMENT ON FUNCTION public.should_show_demo_banner IS 'Returns true if demo mode is active but not yet acknowledged - triggers banner display';
-- ================================================================
-- Clear ALL demo data for test tenant 11111111-1111-1111-1111-111111111111
-- Run this in Supabase SQL Editor to completely wipe and reset
-- ================================================================

-- Set the tenant ID
DO $$
DECLARE
  test_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  operation_ids UUID[];
BEGIN
  RAISE NOTICE 'Starting cleanup for tenant: %', test_tenant_id;

  -- 1. Delete issues
  DELETE FROM issues WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted issues';

  -- 2. Delete operation_quantities
  DELETE FROM operation_quantities WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted operation quantities';

  -- 3. Delete time_entry_pauses (via time_entries)
  DELETE FROM time_entry_pauses 
  WHERE time_entry_id IN (
    SELECT id FROM time_entries WHERE tenant_id = test_tenant_id
  );
  RAISE NOTICE '✓ Deleted time entry pauses';

  -- 4. Delete time_entries
  DELETE FROM time_entries WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted time entries';

  -- 5. Delete substeps
  DELETE FROM substeps WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted substeps';

  -- 6. Delete operation_resources (must get operation IDs first)
  SELECT array_agg(id) INTO operation_ids 
  FROM operations WHERE tenant_id = test_tenant_id;
  
  IF operation_ids IS NOT NULL THEN
    DELETE FROM operation_resources WHERE operation_id = ANY(operation_ids);
    RAISE NOTICE '✓ Deleted operation resources';
  END IF;

  -- 7. Delete operations
  DELETE FROM operations WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted operations';

  -- 8. Delete parts
  DELETE FROM parts WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted parts';

  -- 9. Delete jobs
  DELETE FROM jobs WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted jobs';

  -- 10. Delete cells
  DELETE FROM cells WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted cells';

  -- 11. Delete resources
  DELETE FROM resources WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted resources';

  -- 12. Delete scrap_reasons
  DELETE FROM scrap_reasons WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted scrap reasons';

  -- 13. Delete assignments
  DELETE FROM assignments WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted assignments';

  -- 14. Delete notifications
  DELETE FROM notifications WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted notifications';

  -- 15. Delete demo operator profiles
  DELETE FROM user_roles 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE tenant_id = test_tenant_id 
    AND role = 'operator'
    AND email LIKE '%@sheetmetalconnect.nl'
  );
  
  DELETE FROM profiles 
  WHERE tenant_id = test_tenant_id 
  AND role = 'operator'
  AND email LIKE '%@sheetmetalconnect.nl';
  RAISE NOTICE '✓ Deleted demo operators';

  -- 16. Reset tenant counters
  UPDATE tenants 
  SET 
    current_jobs = 0,
    current_parts_this_month = 0,
    demo_mode_enabled = false,
    demo_mode_acknowledged = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = test_tenant_id;
  RAISE NOTICE '✓ Reset tenant counters and demo mode flags';

  RAISE NOTICE '✅ Cleanup complete! Tenant is ready for fresh demo data.';
END $$;-- ================================================================
-- Setup Sheet Metal Connect e.U. tenant with root admin
-- ================================================================

DO $$
DECLARE
  test_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  luke_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- Fixed UUID for Luke
BEGIN
  -- 1. Update tenant name
  UPDATE tenants 
  SET 
    name = 'Sheet Metal Connect e.U.',
    company_name = 'Sheet Metal Connect e.U.',
    plan = 'premium',
    status = 'active'
  WHERE id = test_tenant_id;
  
  RAISE NOTICE '✓ Updated tenant to Sheet Metal Connect e.U.';

  -- 2. Check if Luke's profile exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'luke@sheetmetalconnect.com') THEN
    -- Create Luke's profile as root admin
    INSERT INTO profiles (
      id,
      tenant_id,
      username,
      full_name,
      email,
      role,
      is_root_admin,
      active,
      is_machine,
      has_email_login
    ) VALUES (
      luke_user_id,
      test_tenant_id,
      'luke',
      'Luke van Enkhuizen',
      'luke@sheetmetalconnect.com',
      'admin',
      true,  -- Root admin flag
      true,
      false,
      true
    );
    
    -- Create user_roles entry
    INSERT INTO user_roles (user_id, role)
    VALUES (luke_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✓ Created Luke as root admin';
  ELSE
    -- Update existing profile to be root admin
    UPDATE profiles 
    SET 
      is_root_admin = true,
      role = 'admin',
      tenant_id = test_tenant_id,
      active = true
    WHERE email = 'luke@sheetmetalconnect.com';
    
    RAISE NOTICE '✓ Updated Luke to root admin';
  END IF;

  RAISE NOTICE '✅ Setup complete! Tenant ready for demo data seeding.';
END $$;-- Wipe tenant data again for fresh seed with assembly relationships
DO $$
DECLARE
  test_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  operation_ids UUID[];
BEGIN
  -- Delete operation_resources first
  SELECT array_agg(id) INTO operation_ids 
  FROM operations WHERE tenant_id = test_tenant_id;
  
  IF operation_ids IS NOT NULL THEN
    DELETE FROM operation_resources WHERE operation_id = ANY(operation_ids);
  END IF;

  -- Delete in dependency order
  DELETE FROM issues WHERE tenant_id = test_tenant_id;
  DELETE FROM operation_quantities WHERE tenant_id = test_tenant_id;
  DELETE FROM time_entry_pauses WHERE time_entry_id IN (SELECT id FROM time_entries WHERE tenant_id = test_tenant_id);
  DELETE FROM time_entries WHERE tenant_id = test_tenant_id;
  DELETE FROM substeps WHERE tenant_id = test_tenant_id;
  DELETE FROM operations WHERE tenant_id = test_tenant_id;
  DELETE FROM parts WHERE tenant_id = test_tenant_id;
  DELETE FROM jobs WHERE tenant_id = test_tenant_id;
  DELETE FROM cells WHERE tenant_id = test_tenant_id;
  DELETE FROM resources WHERE tenant_id = test_tenant_id;
  DELETE FROM scrap_reasons WHERE tenant_id = test_tenant_id;
  DELETE FROM assignments WHERE tenant_id = test_tenant_id;
  DELETE FROM notifications WHERE tenant_id = test_tenant_id;
  
  DELETE FROM user_roles WHERE user_id IN (
    SELECT id FROM profiles WHERE tenant_id = test_tenant_id AND role = 'operator' AND email LIKE '%@sheetmetalconnect.nl'
  );
  DELETE FROM profiles WHERE tenant_id = test_tenant_id AND role = 'operator' AND email LIKE '%@sheetmetalconnect.nl';
  
  UPDATE tenants SET 
    current_jobs = 0,
    current_parts_this_month = 0,
    demo_mode_enabled = false,
    demo_mode_acknowledged = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = test_tenant_id;

  RAISE NOTICE '✅ Tenant data wiped and ready for fresh seed';
END $$;-- GDPR Compliance: Account and Tenant Deletion Functions
-- This migration adds functions to support user account deletion and tenant deletion

-- Function to delete all data for a specific tenant
-- This is used when a tenant admin wants to delete their entire organization
CREATE OR REPLACE FUNCTION delete_tenant_data(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_counts JSONB := '{}'::JSONB;
  v_count INTEGER;
BEGIN
  -- Verify the caller has permission (must be admin of the tenant)
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tenant_id = p_tenant_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only tenant admins can delete tenant data';
  END IF;

  -- Delete data in order (respecting foreign key constraints)
  -- Most child tables already have CASCADE DELETE, but we'll be explicit

  -- Delete webhook logs
  DELETE FROM webhook_logs WHERE webhook_id IN (SELECT id FROM webhooks WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhook_logs}', to_jsonb(v_count));

  -- Delete webhooks
  DELETE FROM webhooks WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhooks}', to_jsonb(v_count));

  -- Delete API keys
  DELETE FROM api_keys WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{api_keys}', to_jsonb(v_count));

  -- Delete operation resources (junction table)
  DELETE FROM operation_resources WHERE operation_id IN (SELECT id FROM operations WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operation_resources}', to_jsonb(v_count));

  -- Delete time entry pauses
  DELETE FROM time_entry_pauses WHERE time_entry_id IN (SELECT id FROM time_entries WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entry_pauses}', to_jsonb(v_count));

  -- Delete time entries
  DELETE FROM time_entries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entries}', to_jsonb(v_count));

  -- Delete assignments
  DELETE FROM assignments WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{assignments}', to_jsonb(v_count));

  -- Delete substeps
  DELETE FROM substeps WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{substeps}', to_jsonb(v_count));

  -- Delete issues
  DELETE FROM issues WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{issues}', to_jsonb(v_count));

  -- Delete operations
  DELETE FROM operations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operations}', to_jsonb(v_count));

  -- Delete parts
  DELETE FROM parts WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{parts}', to_jsonb(v_count));

  -- Delete jobs
  DELETE FROM jobs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{jobs}', to_jsonb(v_count));

  -- Delete resources
  DELETE FROM resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{resources}', to_jsonb(v_count));

  -- Delete materials
  DELETE FROM materials WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{materials}', to_jsonb(v_count));

  -- Delete cells
  DELETE FROM cells WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{cells}', to_jsonb(v_count));

  -- Delete monthly reset logs (if table exists)
  DELETE FROM monthly_reset_logs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{monthly_reset_logs}', to_jsonb(v_count));

  -- Delete user profiles (this will also delete from auth.users via CASCADE)
  DELETE FROM profiles WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{profiles}', to_jsonb(v_count));

  -- Finally, delete the tenant itself
  DELETE FROM tenants WHERE id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{tenants}', to_jsonb(v_count));

  -- Return summary of deleted records
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'deleted_counts', v_deleted_counts,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting tenant data: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_tenant_data(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_tenant_data(UUID) IS
'GDPR Compliance: Deletes all data associated with a tenant. Can only be executed by tenant admins. Returns summary of deleted records.';


-- Function to delete a single user account
-- This is used when an individual user wants to delete their account
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_deleted_counts JSONB := '{}'::JSONB;
  v_count INTEGER;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Delete user-specific data

  -- Delete time entry pauses for this user
  DELETE FROM time_entry_pauses
  WHERE time_entry_id IN (SELECT id FROM time_entries WHERE user_id = v_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entry_pauses}', to_jsonb(v_count));

  -- Delete time entries
  DELETE FROM time_entries WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entries}', to_jsonb(v_count));

  -- Delete assignments
  DELETE FROM assignments WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{assignments}', to_jsonb(v_count));

  -- Delete issues created by this user (or set created_by to NULL if you want to keep the issue)
  -- For GDPR, we'll delete issues created by the user
  DELETE FROM issues WHERE created_by_user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{issues}', to_jsonb(v_count));

  -- Delete the profile (this will cascade to auth.users)
  DELETE FROM profiles WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{profile}', to_jsonb(v_count));

  -- Delete from auth.users (Supabase will handle this via CASCADE from profiles)
  -- Note: Deleting from auth.users will automatically sign out the user
  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{auth_user}', to_jsonb(v_count));

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'deleted_counts', v_deleted_counts,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user account: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_account() IS
'GDPR Compliance: Allows a user to delete their own account and all associated personal data. User will be automatically signed out.';
-- Add factory hours settings to tenants table
-- These are used to automatically stop time tracking at factory closing time

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS factory_opening_time TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS factory_closing_time TIME DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS auto_stop_tracking BOOLEAN DEFAULT false;

-- Add comment to explain the columns
COMMENT ON COLUMN public.tenants.factory_opening_time IS 'Factory opening time (used for scheduling)';
COMMENT ON COLUMN public.tenants.factory_closing_time IS 'Factory closing time (used to auto-stop time tracking if enabled)';
COMMENT ON COLUMN public.tenants.auto_stop_tracking IS 'If true, automatically stop time tracking at factory closing time';-- Enable pgcrypto extension for gen_salt function
CREATE EXTENSION IF NOT EXISTS pgcrypto;-- Create issue_categories table for configurable issue types
CREATE TABLE IF NOT EXISTS issue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  severity_default VARCHAR(20) DEFAULT 'medium' CHECK (severity_default IN ('low', 'medium', 'high', 'critical')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Enable RLS
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant's issue categories"
  ON issue_categories FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert issue categories"
  ON issue_categories FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update issue categories"
  ON issue_categories FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete issue categories"
  ON issue_categories FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Index for performance
CREATE INDEX idx_issue_categories_tenant ON issue_categories(tenant_id);
CREATE INDEX idx_issue_categories_active ON issue_categories(tenant_id, active);

-- Add to realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE issue_categories;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
-- Fix critical security issues by enforcing tenant isolation

-- 1. Fix profiles SELECT policy - restrict to same tenant only  
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 2. Fix activity_log SELECT policy - enforce tenant isolation
DROP POLICY IF EXISTS "Users can view activity logs in their tenant" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_log;
CREATE POLICY "Users can view activity logs in their tenant"
ON public.activity_log FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 3. Fix invitations SELECT policy - restrict to same tenant
DROP POLICY IF EXISTS "Users can view invitations in their tenant" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON public.invitations;
CREATE POLICY "Users can view invitations in their tenant"
ON public.invitations FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 4. Add SELECT policy for api_keys - admin only, same tenant
DROP POLICY IF EXISTS "Admins can view api_keys in their tenant" ON public.api_keys;
CREATE POLICY "Admins can view api_keys in their tenant"
ON public.api_keys FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'admin'::app_role)
);-- ============================================================================
-- INVITATION SYSTEM MIGRATION
-- Creates the invitations table, RPC functions, and RLS policies
-- ============================================================================

-- Create invitations table if not exists
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view invitations in their tenant" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON public.invitations;

-- RLS Policies
-- Admins can view all invitations in their tenant
CREATE POLICY "Users can view invitations in their tenant"
ON public.invitations FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update invitations in their tenant
CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.invitations FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Function: create_invitation
-- Creates a new invitation and returns the invitation ID
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_email TEXT,
  p_role public.app_role DEFAULT 'operator',
  p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
  v_existing_count INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant_id from parameter or current user
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found';
  END IF;

  -- Verify user is admin
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;

  -- Check for existing pending invitation
  SELECT COUNT(*) INTO v_existing_count
  FROM invitations
  WHERE email = LOWER(p_email)
    AND tenant_id = v_tenant_id
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;

  -- Check if user already exists in tenant
  SELECT COUNT(*) INTO v_existing_count
  FROM profiles
  WHERE LOWER(email) = LOWER(p_email)
    AND tenant_id = v_tenant_id;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'A user with this email already exists in this organization';
  END IF;

  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create invitation
  INSERT INTO invitations (
    tenant_id,
    email,
    role,
    token,
    invited_by,
    status,
    expires_at
  ) VALUES (
    v_tenant_id,
    LOWER(p_email),
    p_role,
    v_token,
    v_user_id,
    'pending',
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Function: get_invitation_by_token
-- Returns invitation details by token (public - no auth required)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  email TEXT,
  role public.app_role,
  status TEXT,
  expires_at TIMESTAMPTZ,
  invited_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.tenant_id,
    t.name AS tenant_name,
    i.email,
    i.role,
    i.status,
    i.expires_at,
    p.full_name AS invited_by_name
  FROM invitations i
  JOIN tenants t ON t.id = i.tenant_id
  JOIN profiles p ON p.id = i.invited_by
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
END;
$$;

-- Function: accept_invitation
-- Marks an invitation as accepted
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invitation_id UUID;
BEGIN
  -- Find and update the invitation
  UPDATE invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = p_user_id,
    updated_at = NOW()
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  RETURNING id INTO v_invitation_id;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  RETURN TRUE;
END;
$$;

-- Function: cancel_invitation
-- Cancels a pending invitation
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := get_user_tenant_id();

  -- Verify user is admin
  IF NOT has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can cancel invitations';
  END IF;

  -- Cancel the invitation
  UPDATE invitations
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_invitation_id
    AND tenant_id = v_tenant_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  RETURN TRUE;
END;
$$;

-- Function: cleanup_expired_invitations
-- Marks expired invitations as expired (can be run by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE invitations
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_invitation(TEXT, public.app_role, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invitations() TO authenticated;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_invitations_updated_at ON public.invitations;
CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
-- ============================================================================
-- SHIPPING MANAGEMENT MIGRATION
-- Creates shipments table, shipment_jobs junction, and related functions
-- ============================================================================

-- Create shipment status enum
DO $$ BEGIN
  CREATE TYPE public.shipment_status AS ENUM (
    'draft',
    'planned',
    'loading',
    'in_transit',
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create vehicle type enum
DO $$ BEGIN
  CREATE TYPE public.vehicle_type AS ENUM (
    'truck',
    'van',
    'car',
    'bike',
    'freight',
    'air',
    'sea',
    'rail',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Shipment identification
  shipment_number TEXT NOT NULL,
  name TEXT,
  description TEXT,

  -- Status and scheduling
  status public.shipment_status NOT NULL DEFAULT 'draft',
  scheduled_date DATE,
  scheduled_time TIME,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,

  -- Vehicle information
  vehicle_type public.vehicle_type DEFAULT 'truck',
  vehicle_identifier TEXT,
  driver_name TEXT,
  driver_phone TEXT,

  -- Capacity constraints
  max_weight_kg DECIMAL(10, 2),
  max_volume_m3 DECIMAL(10, 3),
  max_length_cm DECIMAL(10, 2),
  max_width_cm DECIMAL(10, 2),
  max_height_cm DECIMAL(10, 2),

  -- Current load
  current_weight_kg DECIMAL(10, 2) DEFAULT 0,
  current_volume_m3 DECIMAL(10, 3) DEFAULT 0,
  items_count INTEGER DEFAULT 0,

  -- Destination information
  destination_name TEXT,
  destination_address TEXT,
  destination_city TEXT,
  destination_postal_code TEXT,
  destination_country TEXT DEFAULT 'NL',
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),

  -- Origin information (pickup location)
  origin_name TEXT,
  origin_address TEXT,
  origin_city TEXT,
  origin_postal_code TEXT,
  origin_country TEXT DEFAULT 'NL',
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),

  -- Route information
  distance_km DECIMAL(10, 2),
  estimated_duration_minutes INTEGER,
  route_notes TEXT,

  -- Cost tracking
  shipping_cost DECIMAL(10, 2),
  currency TEXT DEFAULT 'EUR',

  -- Additional data
  notes TEXT,
  metadata JSONB,

  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shipment_jobs junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.shipment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Item details for this job in the shipment
  weight_kg DECIMAL(10, 2),
  volume_m3 DECIMAL(10, 3),
  packages_count INTEGER DEFAULT 1,

  -- Loading information
  loading_sequence INTEGER,
  loaded_at TIMESTAMPTZ,
  loaded_by UUID REFERENCES public.profiles(id),

  -- Delivery status for this specific job
  delivered_at TIMESTAMPTZ,
  delivery_notes TEXT,
  delivery_signature TEXT,

  -- Metadata
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a job can only be in one active shipment
  UNIQUE (job_id, shipment_id)
);

-- Create indexes for shipments
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_id ON public.shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_scheduled_date ON public.shipments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_number ON public.shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_shipments_destination_postal ON public.shipments(destination_postal_code);
CREATE INDEX IF NOT EXISTS idx_shipments_destination_city ON public.shipments(destination_city);

-- Create indexes for shipment_jobs
CREATE INDEX IF NOT EXISTS idx_shipment_jobs_shipment_id ON public.shipment_jobs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_jobs_job_id ON public.shipment_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_shipment_jobs_tenant_id ON public.shipment_jobs(tenant_id);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view shipments in their tenant" ON public.shipments;
DROP POLICY IF EXISTS "Admins can create shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;

DROP POLICY IF EXISTS "Users can view shipment_jobs in their tenant" ON public.shipment_jobs;
DROP POLICY IF EXISTS "Admins can create shipment_jobs" ON public.shipment_jobs;
DROP POLICY IF EXISTS "Admins can update shipment_jobs" ON public.shipment_jobs;
DROP POLICY IF EXISTS "Admins can delete shipment_jobs" ON public.shipment_jobs;

-- RLS Policies for shipments
CREATE POLICY "Users can view shipments in their tenant"
ON public.shipments FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create shipments"
ON public.shipments FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update shipments"
ON public.shipments FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete shipments"
ON public.shipments FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for shipment_jobs
CREATE POLICY "Users can view shipment_jobs in their tenant"
ON public.shipment_jobs FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create shipment_jobs"
ON public.shipment_jobs FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update shipment_jobs"
ON public.shipment_jobs FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete shipment_jobs"
ON public.shipment_jobs FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate shipment number
CREATE OR REPLACE FUNCTION public.generate_shipment_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_number TEXT;
BEGIN
  -- Count existing shipments for this tenant this year
  SELECT COUNT(*) + 1 INTO v_count
  FROM shipments
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate number format: SHP-YYYY-XXXXX
  v_number := 'SHP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_count::TEXT, 5, '0');

  RETURN v_number;
END;
$$;

-- Function to update shipment totals when jobs are added/removed
CREATE OR REPLACE FUNCTION public.update_shipment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_shipment_id UUID;
BEGIN
  -- Get the shipment ID
  IF TG_OP = 'DELETE' THEN
    v_shipment_id := OLD.shipment_id;
  ELSE
    v_shipment_id := NEW.shipment_id;
  END IF;

  -- Update the shipment totals
  UPDATE shipments
  SET
    current_weight_kg = COALESCE((
      SELECT SUM(weight_kg)
      FROM shipment_jobs
      WHERE shipment_id = v_shipment_id
    ), 0),
    current_volume_m3 = COALESCE((
      SELECT SUM(volume_m3)
      FROM shipment_jobs
      WHERE shipment_id = v_shipment_id
    ), 0),
    items_count = (
      SELECT COUNT(*)
      FROM shipment_jobs
      WHERE shipment_id = v_shipment_id
    ),
    updated_at = NOW()
  WHERE id = v_shipment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for updating shipment totals
DROP TRIGGER IF EXISTS update_shipment_totals_trigger ON public.shipment_jobs;
CREATE TRIGGER update_shipment_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.shipment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shipment_totals();

-- Add updated_at trigger for shipments
DROP TRIGGER IF EXISTS set_shipments_updated_at ON public.shipments;
CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add updated_at trigger for shipment_jobs
DROP TRIGGER IF EXISTS set_shipment_jobs_updated_at ON public.shipment_jobs;
CREATE TRIGGER set_shipment_jobs_updated_at
  BEFORE UPDATE ON public.shipment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- EXTEND JOBS TABLE WITH DELIVERY INFORMATION
-- ============================================================================

-- Add delivery columns to jobs if they don't exist
DO $$
BEGIN
  -- Delivery address fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'delivery_address') THEN
    ALTER TABLE public.jobs ADD COLUMN delivery_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'delivery_city') THEN
    ALTER TABLE public.jobs ADD COLUMN delivery_city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'delivery_postal_code') THEN
    ALTER TABLE public.jobs ADD COLUMN delivery_postal_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'delivery_country') THEN
    ALTER TABLE public.jobs ADD COLUMN delivery_country TEXT DEFAULT 'NL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'delivery_lat') THEN
    ALTER TABLE public.jobs ADD COLUMN delivery_lat DECIMAL(10, 8);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'delivery_lng') THEN
    ALTER TABLE public.jobs ADD COLUMN delivery_lng DECIMAL(11, 8);
  END IF;

  -- Weight and dimensions for shipping calculation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'total_weight_kg') THEN
    ALTER TABLE public.jobs ADD COLUMN total_weight_kg DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'total_volume_m3') THEN
    ALTER TABLE public.jobs ADD COLUMN total_volume_m3 DECIMAL(10, 3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'package_count') THEN
    ALTER TABLE public.jobs ADD COLUMN package_count INTEGER DEFAULT 1;
  END IF;
END $$;

-- Create index for delivery postal code lookups
CREATE INDEX IF NOT EXISTS idx_jobs_delivery_postal ON public.jobs(delivery_postal_code);
CREATE INDEX IF NOT EXISTS idx_jobs_delivery_city ON public.jobs(delivery_city);

-- ============================================================================
-- EXTEND PARTS TABLE WITH SHIPPING INFORMATION
-- ============================================================================

-- Add essential shipping-related columns to parts
DO $$
BEGIN
  -- Weight for individual part (in kg)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'weight_kg') THEN
    ALTER TABLE public.parts ADD COLUMN weight_kg DECIMAL(10, 3);
  END IF;

  -- Dimensions (in mm - standard for metal fabrication)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'length_mm') THEN
    ALTER TABLE public.parts ADD COLUMN length_mm DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'width_mm') THEN
    ALTER TABLE public.parts ADD COLUMN width_mm DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'height_mm') THEN
    ALTER TABLE public.parts ADD COLUMN height_mm DECIMAL(10, 2);
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.generate_shipment_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shipment_totals() TO authenticated;
-- Migration: Add Scheduler Columns

-- Add capacity_hours_per_day to cells table
ALTER TABLE public.cells 
ADD COLUMN IF NOT EXISTS capacity_hours_per_day numeric DEFAULT 8;

-- Add timing and scheduling columns to operations table
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS setup_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS run_time_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS wait_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS changeover_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_start timestamptz,
ADD COLUMN IF NOT EXISTS planned_end timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.cells.capacity_hours_per_day IS 'Daily capacity in hours for this cell';
COMMENT ON COLUMN public.operations.setup_time IS 'Setup time in minutes';
COMMENT ON COLUMN public.operations.run_time_per_unit IS 'Run time per unit in minutes';
COMMENT ON COLUMN public.operations.wait_time IS 'Wait time in minutes';
COMMENT ON COLUMN public.operations.changeover_time IS 'Changeover time in minutes';
-- Migration: Production Metrics Enhancement
-- Adds: multiple scrap reasons per quantity record

-- ============================================================================
-- 1. REJECTION TRACKING ENHANCEMENT
-- Allow multiple scrap reasons per quantity record via junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operation_quantity_scrap_reasons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_quantity_id uuid NOT NULL REFERENCES public.operation_quantities(id) ON DELETE CASCADE,
    scrap_reason_id uuid NOT NULL REFERENCES public.scrap_reasons(id) ON DELETE RESTRICT,
    quantity integer NOT NULL DEFAULT 1,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(operation_quantity_id, scrap_reason_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_op_qty_scrap_reasons_qty ON public.operation_quantity_scrap_reasons(operation_quantity_id);
CREATE INDEX IF NOT EXISTS idx_op_qty_scrap_reasons_reason ON public.operation_quantity_scrap_reasons(scrap_reason_id);

-- Enable RLS
ALTER TABLE public.operation_quantity_scrap_reasons ENABLE ROW LEVEL SECURITY;

-- RLS Policy via parent table
CREATE POLICY "op_qty_scrap_reasons_tenant_isolation" ON public.operation_quantity_scrap_reasons
    FOR ALL USING (
        operation_quantity_id IN (
            SELECT id FROM public.operation_quantities
            WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "op_qty_scrap_reasons_service_role" ON public.operation_quantity_scrap_reasons
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.operation_quantity_scrap_reasons IS 'Junction table for multiple scrap reasons per operation quantity record';
COMMENT ON COLUMN public.operation_quantity_scrap_reasons.quantity IS 'Number of units scrapped for this specific reason';

-- ============================================================================
-- 2. FUNCTION: Get Detailed Scrap Analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_operation_scrap_analysis(p_operation_id uuid)
RETURNS TABLE (
    scrap_reason_id uuid,
    scrap_reason_code text,
    scrap_reason_description text,
    scrap_reason_category text,
    total_quantity integer,
    occurrence_count integer,
    percentage_of_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_scrap integer;
BEGIN
    -- Get total scrap for percentage calculation
    SELECT COALESCE(SUM(quantity_scrap), 0)
    INTO v_total_scrap
    FROM public.operation_quantities
    WHERE operation_id = p_operation_id;

    RETURN QUERY
    SELECT
        sr.id as scrap_reason_id,
        sr.code as scrap_reason_code,
        sr.description as scrap_reason_description,
        sr.category as scrap_reason_category,
        COALESCE(SUM(oqsr.quantity), 0)::integer as total_quantity,
        COUNT(oqsr.id)::integer as occurrence_count,
        CASE WHEN v_total_scrap > 0
             THEN ROUND((COALESCE(SUM(oqsr.quantity), 0)::numeric / v_total_scrap * 100), 2)
             ELSE 0
        END as percentage_of_total
    FROM public.operation_quantity_scrap_reasons oqsr
    JOIN public.operation_quantities oq ON oq.id = oqsr.operation_quantity_id
    JOIN public.scrap_reasons sr ON sr.id = oqsr.scrap_reason_id
    WHERE oq.operation_id = p_operation_id
    GROUP BY sr.id, sr.code, sr.description, sr.category
    ORDER BY total_quantity DESC;
END;
$$;

COMMENT ON FUNCTION public.get_operation_scrap_analysis IS 'Get detailed scrap analysis with breakdown by reason for an operation';
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
-- Update plan limits for BSL 1.1 pricing model (4 hosted tiers + self-hosted)
-- Free: 25 jobs/mo, 250 parts/mo, 500MB storage
-- Pro: 500 jobs/mo, 5000 parts/mo, 10GB storage
-- Premium: Fair use (2000 jobs/mo, 20000 parts/mo, 100GB storage)
-- Enterprise: Unlimited (NULL) - their infrastructure

-- Add 'enterprise' to the subscription_plan enum if not exists
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

-- Update existing tenants by plan
UPDATE public.tenants
SET
  max_jobs = 25,
  max_parts_per_month = 250,
  max_storage_gb = 1  -- 500MB rounded to 1GB for simplicity
WHERE plan = 'free';

UPDATE public.tenants
SET
  max_jobs = 500,
  max_parts_per_month = 5000,
  max_storage_gb = 10
WHERE plan = 'pro';

-- Premium now has fair use limits (high but not unlimited)
UPDATE public.tenants
SET
  max_jobs = 2000,
  max_parts_per_month = 20000,
  max_storage_gb = 100
WHERE plan = 'premium';

-- Enterprise has unlimited (NULL)
-- Note: Existing 'premium' tenants that should be enterprise need manual migration
UPDATE public.tenants
SET
  max_jobs = NULL,
  max_parts_per_month = NULL,
  max_storage_gb = NULL
WHERE plan = 'enterprise';

-- Update the handle_new_tenant function with new free tier defaults
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    -- Create new tenant with free plan defaults (BSL 1.1 model)
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
      25,    -- Free tier: 25 jobs/mo
      250,   -- Free tier: 250 parts/mo
      1,     -- Free tier: ~500MB (1GB for simplicity)
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create or replace function to get plan limits by plan type
-- Used for documentation and plan upgrades
CREATE OR REPLACE FUNCTION public.get_plan_limits(p_plan subscription_plan)
RETURNS TABLE (
  plan_name TEXT,
  max_jobs INTEGER,
  max_parts_per_month INTEGER,
  max_storage_gb INTEGER,
  has_webhooks BOOLEAN,
  has_mcp_server BOOLEAN,
  has_sso BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    p_plan::TEXT,
    CASE p_plan
      WHEN 'free' THEN 25
      WHEN 'pro' THEN 500
      WHEN 'premium' THEN 2000      -- Fair use
      WHEN 'enterprise' THEN NULL   -- Unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 250
      WHEN 'pro' THEN 5000
      WHEN 'premium' THEN 20000     -- Fair use
      WHEN 'enterprise' THEN NULL   -- Unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 1
      WHEN 'pro' THEN 10
      WHEN 'premium' THEN 100
      WHEN 'enterprise' THEN NULL   -- Unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'premium' THEN TRUE
      WHEN 'enterprise' THEN TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN TRUE
      WHEN 'premium' THEN TRUE
      WHEN 'enterprise' THEN TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'pro' THEN FALSE
      WHEN 'premium' THEN TRUE
      WHEN 'enterprise' THEN TRUE
    END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_plan_limits IS 'Returns plan limits for BSL 1.1 pricing model. Free: 25/250/1GB. Pro: 500/5K/10GB. Premium: 2K/20K/100GB (fair use). Enterprise: unlimited.';
