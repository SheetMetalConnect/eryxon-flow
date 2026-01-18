-- Add onboarding tracking fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mock_data_imported BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups on onboarding status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON public.profiles(onboarding_completed);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indicates if user has completed the onboarding wizard';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current step in onboarding wizard (0 = not started)';
COMMENT ON COLUMN public.profiles.tour_completed IS 'Indicates if user has completed the app tour';
COMMENT ON COLUMN public.profiles.mock_data_imported IS 'Indicates if mock data has been imported for this user';