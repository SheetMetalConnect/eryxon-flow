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