-- Replace only category values; CREATE OR REPLACE preserves existing privileges.
CREATE OR REPLACE FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") RETURNS TABLE("inserted_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  SELECT COUNT(*) INTO v_count FROM public.scrap_reasons WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Scrap reasons already exist for this tenant'::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.scrap_reasons (tenant_id, code, description, category)
  VALUES
    (p_tenant_id, 'MAT-001', 'Material surface defect', 'material'),
    (p_tenant_id, 'MAT-002', 'Material thickness out of spec', 'material'),
    (p_tenant_id, 'MAT-003', 'Material contamination', 'material'),
    (p_tenant_id, 'MAT-004', 'Material hardness issue', 'material'),
    (p_tenant_id, 'MAT-005', 'Wrong material supplied', 'material'),
    (p_tenant_id, 'PRC-001', 'Cutting burn marks', 'process'),
    (p_tenant_id, 'PRC-002', 'Bend angle out of tolerance', 'process'),
    (p_tenant_id, 'PRC-003', 'Weld defect - porosity', 'process'),
    (p_tenant_id, 'PRC-004', 'Weld defect - undercut', 'process'),
    (p_tenant_id, 'PRC-005', 'Surface finish defect', 'process'),
    (p_tenant_id, 'PRC-006', 'Dimensions out of tolerance', 'process'),
    (p_tenant_id, 'PRC-007', 'Deburring incomplete', 'process'),
    (p_tenant_id, 'PRC-008', 'Coating defect - runs/sags', 'process'),
    (p_tenant_id, 'PRC-009', 'Coating defect - insufficient coverage', 'process'),
    (p_tenant_id, 'EQP-001', 'Machine calibration drift', 'equipment'),
    (p_tenant_id, 'EQP-002', 'Tool wear excessive', 'equipment'),
    (p_tenant_id, 'EQP-003', 'Equipment malfunction', 'equipment'),
    (p_tenant_id, 'EQP-004', 'Fixture/tooling damage', 'equipment'),
    (p_tenant_id, 'EQP-005', 'Clamp marks on part', 'equipment'),
    (p_tenant_id, 'OPR-001', 'Setup error', 'operator'),
    (p_tenant_id, 'OPR-002', 'Wrong operation performed', 'operator'),
    (p_tenant_id, 'OPR-003', 'Handling damage', 'operator'),
    (p_tenant_id, 'OPR-004', 'Incorrect measurement', 'operator'),
    (p_tenant_id, 'OPR-005', 'Assembly error', 'operator'),
    (p_tenant_id, 'DSN-001', 'Design dimension error', 'design'),
    (p_tenant_id, 'DSN-002', 'Design manufacturability issue', 'design'),
    (p_tenant_id, 'DSN-003', 'Tolerance stack-up problem', 'design'),
    (p_tenant_id, 'OTH-001', 'Customer specification change', 'other'),
    (p_tenant_id, 'OTH-002', 'Prototype/first article', 'other'),
    (p_tenant_id, 'OTH-003', 'Rework - customer request', 'other'),
    (p_tenant_id, 'OTH-004', 'Unknown cause - investigation needed', 'other');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully inserted %s default scrap reasons', v_count)::TEXT;
END;
$$;
