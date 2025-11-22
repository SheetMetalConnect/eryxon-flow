-- Seed data for resources system
-- This creates comprehensive test data for various resource types

-- First, we need to get a tenant_id to use for seeding
-- This assumes there's at least one tenant in the system
DO $$
DECLARE
  v_tenant_id UUID;
  v_operation_ids UUID[];

  -- Resource IDs for later linking
  v_welding_fixture_1 UUID := gen_random_uuid();
  v_welding_fixture_2 UUID := gen_random_uuid();
  v_bending_mold_1 UUID := gen_random_uuid();
  v_bending_mold_2 UUID := gen_random_uuid();
  v_punch_tool_1 UUID := gen_random_uuid();
  v_die_tool_1 UUID := gen_random_uuid();
  v_laser_lens UUID := gen_random_uuid();
  v_fastener_rivets UUID := gen_random_uuid();
  v_fastener_bolts UUID := gen_random_uuid();
  v_inspection_gauge UUID := gen_random_uuid();
  v_assembly_fixture UUID := gen_random_uuid();
  v_material_steel UUID := gen_random_uuid();
  v_material_aluminum UUID := gen_random_uuid();

BEGIN
  -- Get the first tenant_id
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant found. Skipping resource seed data.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding resources for tenant: %', v_tenant_id;

  -- ==========================================
  -- WELDING FIXTURES
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_welding_fixture_1,
    v_tenant_id,
    'Heavy Duty Welding Fixture - Frame Assembly',
    'fixture',
    'Large welding fixture for frame assemblies, supports up to 500kg workpieces',
    'WF-001-HD',
    'Cell A - Welding Station 1',
    'available',
    jsonb_build_object(
      'fixtureId', 'WF-001-HD',
      'fixtureName', 'Heavy Duty Welding Fixture - Frame Assembly',
      'fixtureType', 'welding',
      'capacity', 500,
      'setupTime', 15,
      'calibrationDue', '2025-12-31',
      'location', 'Cell A - Welding Station 1',
      'notes', 'Requires two operators for setup. Check calibration monthly.'
    ),
    true
  ),
  (
    v_welding_fixture_2,
    v_tenant_id,
    'Precision Spot Welding Fixture',
    'fixture',
    'High precision fixture for spot welding operations on sheet metal parts',
    'WF-002-PR',
    'Cell A - Welding Station 2',
    'available',
    jsonb_build_object(
      'fixtureId', 'WF-002-PR',
      'fixtureName', 'Precision Spot Welding Fixture',
      'fixtureType', 'welding',
      'capacity', 50,
      'setupTime', 8,
      'calibrationDue', '2025-06-30',
      'location', 'Cell A - Welding Station 2',
      'notes', 'Clean contact points before each use.'
    ),
    true
  );

  -- ==========================================
  -- BENDING MOLDS/DIES
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_bending_mold_1,
    v_tenant_id,
    '90° V-Die Set - 2mm Sheet Metal',
    'mold',
    'Standard 90-degree V-die for bending 2mm sheet metal',
    'BD-V90-2MM',
    'Cell B - Press Brake Station',
    'available',
    jsonb_build_object(
      'moldId', 'BD-V90-2MM',
      'moldName', '90° V-Die Set - 2mm Sheet Metal',
      'angle', 90,
      'thickness', '2mm',
      'material', 'Hardened Tool Steel',
      'setupTime', 10,
      'notes', 'Compatible with Amada press brake only'
    ),
    true
  ),
  (
    v_bending_mold_2,
    v_tenant_id,
    'Radius Bending Die - 50mm Radius',
    'mold',
    'Radius die for creating smooth 50mm radius bends',
    'BD-R50',
    'Cell B - Press Brake Station',
    'available',
    jsonb_build_object(
      'moldId', 'BD-R50',
      'moldName', 'Radius Bending Die - 50mm Radius',
      'radius', 50,
      'material', 'Hardened Tool Steel',
      'setupTime', 12,
      'notes', 'Use with radius punch BD-RP50'
    ),
    true
  );

  -- ==========================================
  -- TOOLING (Punches, Dies, Cutting Tools)
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_punch_tool_1,
    v_tenant_id,
    'Hydraulic Punch - 25mm Diameter',
    'tooling',
    'Hydraulic punch for creating 25mm diameter holes',
    'PT-H25',
    'Tool Storage - Row 3',
    'available',
    jsonb_build_object(
      'toolId', 'PT-H25',
      'toolName', 'Hydraulic Punch - 25mm Diameter',
      'toolType', 'punch',
      'diameter', 25,
      'material', 'High Speed Steel',
      'coatingType', 'TiN (Titanium Nitride)',
      'setupTime', 5,
      'lifeExpectancy', 5000,
      'currentUses', 1247,
      'maintenanceDue', '2025-03-15',
      'notes', 'Re-sharpen after 5000 uses'
    ),
    true
  ),
  (
    v_die_tool_1,
    v_tenant_id,
    'Turret Punch Die Set - Multi-Station',
    'tooling',
    'Complete die set for turret punch with 12 stations',
    'TD-MS12',
    'Tool Storage - Cabinet A',
    'in_use',
    jsonb_build_object(
      'toolId', 'TD-MS12',
      'toolName', 'Turret Punch Die Set - Multi-Station',
      'toolType', 'die',
      'stations', 12,
      'material', 'Carbide',
      'setupTime', 30,
      'lifeExpectancy', 50000,
      'currentUses', 12500,
      'notes', 'Currently installed in Turret Punch #1'
    ),
    true
  ),
  (
    v_laser_lens,
    v_tenant_id,
    'Laser Cutting Lens - 5" Focus',
    'tooling',
    'Precision lens for laser cutting operations, 5 inch focal length',
    'LC-L5',
    'Laser Cutter - Installed',
    'in_use',
    jsonb_build_object(
      'toolId', 'LC-L5',
      'toolName', 'Laser Cutting Lens - 5" Focus',
      'toolType', 'cutting',
      'length', 5,
      'material', 'Zinc Selenide',
      'coatingType', 'Anti-reflective',
      'setupTime', 20,
      'lifeExpectancy', 10000,
      'currentUses', 3456,
      'maintenanceDue', '2025-02-01',
      'notes', 'Clean weekly. Replace if scratched or pitted.'
    ),
    true
  );

  -- ==========================================
  -- FASTENERS & CONSUMABLES
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_fastener_rivets,
    v_tenant_id,
    'Aluminum Pop Rivets - 4.8mm x 12mm',
    'material',
    'Standard aluminum pop rivets for sheet metal assembly',
    'RV-AL-4812',
    'Parts Storage - Bin R-12',
    'available',
    jsonb_build_object(
      'materialType', 'Fastener',
      'grade', 'Aluminum 5056',
      'diameter', '4.8mm',
      'length', '12mm',
      'supplier', 'Industrial Fasteners Inc',
      'lotNumber', 'LOT-2024-11-456',
      'notes', 'Box of 1000 rivets. Reorder at 200 remaining.'
    ),
    true
  ),
  (
    v_fastener_bolts,
    v_tenant_id,
    'Hex Bolts M8 x 30mm - Grade 8.8',
    'material',
    'High strength hex bolts for structural assembly',
    'BLT-M8-30',
    'Parts Storage - Bin B-05',
    'available',
    jsonb_build_object(
      'materialType', 'Fastener',
      'grade', '8.8',
      'diameter', 'M8',
      'length', '30mm',
      'material', 'Carbon Steel',
      'finish', 'Zinc Plated',
      'supplier', 'Bolt Supply Co',
      'lotNumber', 'LOT-2024-10-789',
      'certifications', '["ISO 898-1", "DIN 933"]',
      'notes', 'Box of 500 bolts. Comes with matching washers and nuts.'
    ),
    true
  );

  -- ==========================================
  -- INSPECTION FIXTURES
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_inspection_gauge,
    v_tenant_id,
    'CMM Inspection Fixture - Frame Parts',
    'fixture',
    'Coordinate measuring machine fixture for frame part inspection',
    'IF-CMM-01',
    'Quality Lab - CMM Station',
    'available',
    jsonb_build_object(
      'fixtureId', 'IF-CMM-01',
      'fixtureName', 'CMM Inspection Fixture - Frame Parts',
      'fixtureType', 'inspection',
      'setupTime', 5,
      'calibrationDue', '2025-08-15',
      'location', 'Quality Lab - CMM Station',
      'notes', 'Calibrated monthly. Handle with care to maintain accuracy.'
    ),
    true
  );

  -- ==========================================
  -- ASSEMBLY FIXTURES
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_assembly_fixture,
    v_tenant_id,
    'Final Assembly Jig - Cabinet Frame',
    'fixture',
    'Custom jig for final cabinet frame assembly, holds 4 panels',
    'AF-CAB-01',
    'Assembly Area - Station 3',
    'maintenance',
    jsonb_build_object(
      'fixtureId', 'AF-CAB-01',
      'fixtureName', 'Final Assembly Jig - Cabinet Frame',
      'fixtureType', 'assembly',
      'capacity', 4,
      'setupTime', 10,
      'calibrationDue', '2025-01-20',
      'location', 'Assembly Area - Station 3',
      'notes', 'Currently in maintenance - alignment pins need replacement'
    ),
    true
  );

  -- ==========================================
  -- RAW MATERIALS
  -- ==========================================

  INSERT INTO resources (id, tenant_id, name, type, description, identifier, location, status, metadata, active)
  VALUES
  (
    v_material_steel,
    v_tenant_id,
    'Cold Rolled Steel Sheet - 2mm x 1250mm x 2500mm',
    'material',
    'Standard cold rolled steel sheets for general fabrication',
    'MT-CRS-2MM',
    'Raw Material Storage - Rack A',
    'available',
    jsonb_build_object(
      'materialType', 'Sheet Metal',
      'grade', 'CRS 1008',
      'thickness', '2mm',
      'width', 1250,
      'length', 2500,
      'weight', 49.1,
      'finish', 'Cold Rolled',
      'supplier', 'Steel Suppliers Inc',
      'lotNumber', 'LOT-CRS-2024-345',
      'certifications', '["ASTM A1008", "ISO 9001"]',
      'notes', 'Sheet count: 45. Reorder at 10 sheets.'
    ),
    true
  ),
  (
    v_material_aluminum,
    v_tenant_id,
    'Aluminum Sheet 5052-H32 - 3mm x 1220mm x 2440mm',
    'material',
    'Marine grade aluminum sheets with good corrosion resistance',
    'MT-AL5052-3MM',
    'Raw Material Storage - Rack B',
    'available',
    jsonb_build_object(
      'materialType', 'Sheet Metal',
      'grade', '5052-H32',
      'thickness', '3mm',
      'width', 1220,
      'length', 2440,
      'weight', 24.3,
      'finish', 'Mill Finish',
      'supplier', 'Aluminum Source Ltd',
      'lotNumber', 'LOT-AL-2024-678',
      'certifications', '["ASTM B209", "AMS-QQ-A-250/8"]',
      'notes', 'Sheet count: 28. Used for marine and outdoor applications.'
    ),
    true
  );

  RAISE NOTICE 'Successfully created % resources', 13;

  -- ==========================================
  -- LINK RESOURCES TO OPERATIONS
  -- ==========================================

  -- Get some operation IDs to link resources to
  -- We'll get operations that match typical manufacturing process names
  SELECT ARRAY(
    SELECT id FROM operations
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at DESC
    LIMIT 10
  ) INTO v_operation_ids;

  IF array_length(v_operation_ids, 1) IS NULL OR array_length(v_operation_ids, 1) = 0 THEN
    RAISE NOTICE 'No operations found. Skipping operation_resources linking.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % operations to link resources to', array_length(v_operation_ids, 1);

  -- Link resources to operations based on operation names
  -- We'll use a best-effort approach to match resources to relevant operations

  -- For each operation, try to link appropriate resources
  DECLARE
    v_op_id UUID;
    v_op_name TEXT;
    v_op_cell TEXT;
  BEGIN
    FOR v_op_id, v_op_name, v_op_cell IN
      SELECT o.id, o.operation_name, c.name
      FROM operations o
      LEFT JOIN cells c ON c.id = o.cell_id
      WHERE o.tenant_id = v_tenant_id
      AND o.id = ANY(v_operation_ids)
    LOOP
      RAISE NOTICE 'Processing operation: % (%) in cell: %', v_op_name, v_op_id, v_op_cell;

      -- Link welding resources to welding operations
      IF v_op_name ILIKE '%weld%' OR v_op_cell ILIKE '%weld%' THEN
        INSERT INTO operation_resources (operation_id, resource_id, quantity, notes)
        VALUES
          (v_op_id, v_welding_fixture_1, 1, 'Position workpiece securely before starting weld. Check fixture alignment.'),
          (v_op_id, v_fastener_rivets, 12, 'Used for pre-assembly before welding')
        ON CONFLICT (operation_id, resource_id) DO NOTHING;

        RAISE NOTICE '  → Linked welding resources';
      END IF;

      -- Link bending resources to bending operations
      IF v_op_name ILIKE '%bend%' OR v_op_cell ILIKE '%bend%' OR v_op_name ILIKE '%brake%' THEN
        INSERT INTO operation_resources (operation_id, resource_id, quantity, notes)
        VALUES
          (v_op_id, v_bending_mold_1, 1, 'Set upper and lower dies. Verify alignment before first bend.'),
          (v_op_id, v_material_steel, 0.5, 'Approximately half a sheet required per part')
        ON CONFLICT (operation_id, resource_id) DO NOTHING;

        RAISE NOTICE '  → Linked bending resources';
      END IF;

      -- Link cutting/punching resources to cutting operations
      IF v_op_name ILIKE '%cut%' OR v_op_name ILIKE '%punch%' OR v_op_name ILIKE '%laser%' OR v_op_name ILIKE '%shear%' THEN
        INSERT INTO operation_resources (operation_id, resource_id, quantity, notes)
        VALUES
          (v_op_id, v_punch_tool_1, 1, 'Verify punch is sharp. Replace if showing wear.'),
          (v_op_id, v_material_steel, 1, 'One full sheet per cutting program')
        ON CONFLICT (operation_id, resource_id) DO NOTHING;

        -- Add laser lens if it's a laser operation
        IF v_op_name ILIKE '%laser%' THEN
          INSERT INTO operation_resources (operation_id, resource_id, quantity, notes)
          VALUES (v_op_id, v_laser_lens, 1, 'Clean lens before operation. Check focus.')
          ON CONFLICT (operation_id, resource_id) DO NOTHING;
        END IF;

        RAISE NOTICE '  → Linked cutting resources';
      END IF;

      -- Link assembly resources to assembly operations
      IF v_op_name ILIKE '%assem%' OR v_op_name ILIKE '%install%' THEN
        INSERT INTO operation_resources (operation_id, resource_id, quantity, notes)
        VALUES
          (v_op_id, v_assembly_fixture, 1, 'Check fixture pins before use'),
          (v_op_id, v_fastener_bolts, 8, '8 bolts required per assembly'),
          (v_op_id, v_fastener_rivets, 16, '16 rivets for panel attachment')
        ON CONFLICT (operation_id, resource_id) DO NOTHING;

        RAISE NOTICE '  → Linked assembly resources';
      END IF;

      -- Link inspection resources to inspection/QC operations
      IF v_op_name ILIKE '%inspect%' OR v_op_name ILIKE '%quality%' OR v_op_name ILIKE '%QC%' OR v_op_name ILIKE '%check%' THEN
        INSERT INTO operation_resources (operation_id, resource_id, quantity, notes)
        VALUES (v_op_id, v_inspection_gauge, 1, 'Follow CMM inspection procedure. Record all measurements.')
        ON CONFLICT (operation_id, resource_id) DO NOTHING;

        RAISE NOTICE '  → Linked inspection resources';
      END IF;

    END LOOP;
  END;

  -- Count how many links were created
  DECLARE
    v_link_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_link_count
    FROM operation_resources
    WHERE operation_id = ANY(v_operation_ids);

    RAISE NOTICE 'Successfully created % operation-resource links', v_link_count;
  END;

END $$;
