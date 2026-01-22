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
