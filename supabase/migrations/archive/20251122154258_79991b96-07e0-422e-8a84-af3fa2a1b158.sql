-- =====================================================
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
GRANT EXECUTE ON FUNCTION public.get_part_routing(UUID) TO authenticated;