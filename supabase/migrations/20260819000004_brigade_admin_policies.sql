-- Grant brigade_admin the same read/manage access as admin, scoped to their brigade.
-- The RESTRICTIVE "profiles_brigade_restrict" and "user_roles_brigade_restrict" policies
-- (migration 20260819000002) already enforce the brigade ceiling — these permissive
-- policies just open the door so the restrictive ones can gate it correctly.

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Add brigade_admin to the "Admins can view all profiles" permissive policy.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)        OR
  has_role(auth.uid(), 'super_admin'::app_role)  OR
  has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  has_role(auth.uid(), 'brigade_admin'::app_role)
);

-- ─── user_roles — read ────────────────────────────────────────────────────────
-- Add brigade_admin to "Admins can view all roles".
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)         OR
  has_role(auth.uid(), 'super_admin'::app_role)   OR
  has_role(auth.uid(), 'division_admin'::app_role) OR
  has_role(auth.uid(), 'brigade_admin'::app_role)
);

-- ─── user_roles — write ───────────────────────────────────────────────────────
-- Add brigade_admin to "Admins can manage roles" (INSERT / UPDATE / DELETE).
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)        OR
  has_role(auth.uid(), 'brigade_admin'::app_role)
);
