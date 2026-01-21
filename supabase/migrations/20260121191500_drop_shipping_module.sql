-- Migration: Drop Shipping Module
-- Purpose: Locally record the removal of shipping tables, enums, and functions.

-- Drop triggers first
DROP TRIGGER IF EXISTS update_shipment_totals_trigger ON public.shipment_jobs;
DROP TRIGGER IF EXISTS set_shipments_updated_at ON public.shipments;
DROP TRIGGER IF EXISTS set_shipment_jobs_updated_at ON public.shipment_jobs;

-- Drop functions
DROP FUNCTION IF EXISTS public.generate_shipment_number(UUID);
DROP FUNCTION IF EXISTS public.update_shipment_totals();

-- Drop junction table first (FK dependency)
DROP TABLE IF EXISTS public.shipment_jobs;

-- Drop main table
DROP TABLE IF EXISTS public.shipments;

-- Drop enums
DROP TYPE IF EXISTS public.shipment_status;
DROP TYPE IF EXISTS public.vehicle_type;
