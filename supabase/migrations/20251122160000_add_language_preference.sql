-- Add language_preference field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS language_preference TEXT CHECK (language_preference IN ('en', 'nl', 'de'));

-- Set default language preference to 'en' for existing users
UPDATE profiles
SET language_preference = 'en'
WHERE language_preference IS NULL;

-- Add comment
COMMENT ON COLUMN profiles.language_preference IS 'User preferred language (en, nl, de)';
