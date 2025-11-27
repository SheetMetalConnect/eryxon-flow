-- ================================================================
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
END $$;