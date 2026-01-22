-- Add onboarding tracking fields to profiles table
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
