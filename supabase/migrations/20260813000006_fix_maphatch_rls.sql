-- Fix 1: Infinite recursion in "Maphatch admins can view department profiles" policy.
-- The original policy had a direct subquery on profiles inside a profiles SELECT policy,
-- causing infinite recursion. Replace with a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.get_my_department()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Drop the recursive policy and recreate it using the SECURITY DEFINER function.
DROP POLICY IF EXISTS "Maphatch admins can view department profiles" ON public.profiles;

CREATE POLICY "Maphatch admins can view department profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maphatch_admin'::app_role)
  AND user_type = 'maphatch'
  AND department = get_my_department()
);

-- Fix 2: super_admin could not read user_roles of other users (only 'admin' was allowed).
-- Update the existing policy to include super_admin and division_admin.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'division_admin'::app_role)
);

-- Fix 3: maphatch_admin needs to read user_roles for users in their department.
CREATE POLICY "Maphatch admins can view department user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maphatch_admin'::app_role)
  AND user_id IN (
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.user_type = 'maphatch'
      AND p.department = get_my_department()
  )
);
