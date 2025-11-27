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
