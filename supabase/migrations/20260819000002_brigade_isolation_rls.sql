-- Brigade-isolation RESTRICTIVE policies for profiles and user_roles.
--
-- Existing PERMISSIVE policies already control who can see what (own row,
-- admins see all, etc.).  These RESTRICTIVE policies add a hard ceiling:
-- even if a permissive policy says "admin can view all", the AND with this
-- restrictive policy limits them to their own brigade.
--
-- Helper functions used (SECURITY DEFINER, no RLS recursion risk):
--   public.is_division_admin(_user_id uuid) → bool
--     true for super_admin / division_admin — they bypass brigade restriction
--   public.get_user_brigade(_user_id uuid) → text
--     reads profiles.brigade for the given user_id

-- ─── profiles ─────────────────────────────────────────────────────────────
-- Drop any pre-existing version of this policy so we can recreate it cleanly.
DROP POLICY IF EXISTS "profiles_brigade_restrict" ON public.profiles;

CREATE POLICY "profiles_brigade_restrict" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    -- super_admin and division_admin see everything
    public.is_division_admin(auth.uid())
    -- Users always see their own row
    OR user_id = auth.uid()
    -- Profiles with no brigade are visible to everyone (legacy / system rows)
    OR brigade IS NULL
    -- Same brigade as the current user
    OR brigade = public.get_user_brigade(auth.uid())
  );

-- ─── user_roles ───────────────────────────────────────────────────────────
-- user_roles has no brigade column, so we look up the brigade of the target
-- user via get_user_brigade().  COALESCE(…, caller's brigade) means users
-- without a profile row are treated as same brigade (orphan users remain
-- manageable by the local admin).

DROP POLICY IF EXISTS "user_roles_brigade_restrict" ON public.user_roles;

CREATE POLICY "user_roles_brigade_restrict" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_division_admin(auth.uid())
    OR user_id = auth.uid()
    -- Target user's brigade must match caller's brigade (NULL = same)
    OR COALESCE(
         public.get_user_brigade(user_id),
         public.get_user_brigade(auth.uid())
       ) = public.get_user_brigade(auth.uid())
  );
