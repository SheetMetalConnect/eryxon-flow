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