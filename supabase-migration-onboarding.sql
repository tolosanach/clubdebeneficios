-- ============================================================
-- Onboarding migration
-- Run in Supabase > SQL Editor
-- ============================================================

-- Add phone column (already referenced in API, not in base schema)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add location columns (saved during onboarding step 5)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country  TEXT;

-- Add onboarding flag (DEFAULT FALSE → new inserts start as false)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Mark existing users as already onboarded so they don't see the flow
UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed IS NULL;
