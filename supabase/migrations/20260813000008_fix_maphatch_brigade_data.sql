-- Fix maphatch users whose brigade was stored incorrectly.
-- Users who registered before the trigger update (20260813000003) had their
-- brigade defaulted to 'binyamin' instead of the brigade they actually selected.
-- This updates profiles.brigade from auth.users.raw_user_meta_data.brigade.

UPDATE public.profiles p
SET brigade = COALESCE(
  (SELECT u.raw_user_meta_data ->> 'brigade'
   FROM auth.users u
   WHERE u.id = p.user_id
     AND (u.raw_user_meta_data ->> 'brigade') IS NOT NULL
     AND (u.raw_user_meta_data ->> 'brigade') != ''
  ),
  p.brigade
)
WHERE p.user_type = 'maphatch';
