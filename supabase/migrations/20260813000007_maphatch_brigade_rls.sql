-- Restrict maphatch visibility to same brigade as well as same department.
-- Previously the policy only filtered by department, so a maphatch_admin could
-- see users from the same department in OTHER brigades.

-- Helper function: returns the current user's brigade (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_my_brigade()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brigade FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Profiles: drop old dept-only policy and recreate with brigade filter
DROP POLICY IF EXISTS "Maphatch admins can view department profiles" ON public.profiles;

CREATE POLICY "Maphatch admins can view department profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maphatch_admin'::app_role)
  AND user_type = 'maphatch'
  AND department = get_my_department()
  AND brigade    = get_my_brigade()
);

-- user_roles: drop old dept-only policy and recreate with brigade filter
DROP POLICY IF EXISTS "Maphatch admins can view department user roles" ON public.user_roles;

CREATE POLICY "Maphatch admins can view department user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maphatch_admin'::app_role)
  AND user_id IN (
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.user_type  = 'maphatch'
      AND p.department = get_my_department()
      AND p.brigade    = get_my_brigade()
  )
);
