-- Soft-delete support for profiles.
--
-- Previously, deleting an auth user cascaded into public.profiles (deleting the row),
-- which caused all historical display of "who did what" to show blank names.
-- Now we:
--   1. Make profiles.user_id nullable  →  SET NULL when auth user is removed
--   2. Change the FK behaviour CASCADE → SET NULL
--   3. Add is_active + deleted_at so UsersManagement can hide inactive profiles
--
-- The profile row itself is preserved so that historical joins to profiles.personal_number,
-- profiles.full_name, profiles.brigade, etc. continue to work even after the auth
-- account is removed.

-- Step 1: make user_id nullable (required by SET NULL FK behaviour)
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: swap the FK from CASCADE to SET NULL
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: soft-delete columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index so active-only queries stay fast
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS profiles_brigade_active_idx ON public.profiles(brigade, is_active);
